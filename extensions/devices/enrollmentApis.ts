/**
 * Device Enrollment APIs
 *
 * Provides endpoints for managing device enrollment approval workflow:
 * - GET /api/core/v1/devices/enrollments/pending - List pending enrollments
 * - POST /api/core/v1/devices/enrollments/:deviceName/approve - Approve enrollment
 * - POST /api/core/v1/devices/enrollments/:deviceName/reject - Reject enrollment
 * - GET /api/core/v1/devices/enrollments/:deviceName/status - Get enrollment status
 */

import { API, hasPermission } from "protobase";
import { handler, getServiceToken } from 'protonode';
import { getLogger, generateEvent, ProtoMemDB } from 'protobase';
import { DevicesModel } from "./devices";
import { promises as promisesFs } from 'fs';
import * as fspath from 'path';

const logger = getLogger();

/**
 * Get pending enrollments from ProtoMemDB
 */
const getPendingEnrollments = (): any[] => {
  const enrollments: any[] = [];
  const memdb = ProtoMemDB('enrollments');
  const pendingData = memdb.get('pending');

  if (!pendingData || typeof pendingData !== 'object') {
    return [];
  }

  // Iterate through platforms
  for (const platform in pendingData) {
    const platformData = pendingData[platform];
    if (platformData && typeof platformData === 'object') {
      // Iterate through devices in this platform
      for (const deviceName in platformData) {
        const deviceData = platformData[deviceName];
        if (deviceData && typeof deviceData === 'object') {
          enrollments.push(deviceData);
        }
      }
    }
  }

  return enrollments;
};

/**
 * Remove enrollment from ProtoMemDB
 */
const removeEnrollment = (platform: string, deviceName: string) => {
  try {
    const memdb = ProtoMemDB('enrollments');
    // Get the pending data structure
    const pendingData = memdb.get('pending');
    if (pendingData && pendingData[platform] && pendingData[platform][deviceName]) {
      // Remove the device from the platform
      delete pendingData[platform][deviceName];

      // If platform is empty, remove it
      if (Object.keys(pendingData[platform]).length === 0) {
        delete pendingData[platform];
      }

      // Update the memdb
      memdb.set('pending', pendingData);
    }
  } catch (err) {
    logger.warn({ platform, deviceName, err }, 'Failed to remove enrollment from ProtoMemDB');
  }
};

export default (app, context) => {
  /**
   * GET /api/core/v1/devices/enrollments/pending
   * Returns array of pending enrollments
   */
  app.get('/api/core/v1/devices/enrollments/pending', handler(async (req, res, session) => {
    hasPermission(session, 'enrollments.read')

    try {
      const enrollments = getPendingEnrollments();
      res.send({ items: enrollments, count: enrollments.length });
    } catch (err) {
      logger.error({ err }, 'Failed to get pending enrollments');
      res.status(500).send({ error: 'Failed to get pending enrollments' });
    }
  }));

  /**
   * POST /api/core/v1/devices/enrollments/:deviceName/approve
   * Approve a pending device enrollment
   */
  app.post('/api/core/v1/devices/enrollments/:deviceName/approve', handler(async (req, res, session) => {
    hasPermission(session, 'enrollments.approve')

    const deviceName = req.params.deviceName;
    const token = getServiceToken();

    try {
      // 1. Fetch device from API
      const deviceRes = await API.get(`/api/core/v1/devices/${encodeURIComponent(deviceName)}?token=${token}`);

      if (deviceRes.isError || !deviceRes.data) {
        res.status(404).send({ error: `Device ${deviceName} not found` });
        return;
      }

      const device = deviceRes.data;

      // 2. Verify device is in pending status
      if (device.data?.enrollment?.status !== 'pending') {
        res.status(400).send({
          error: `Device ${deviceName} is not in pending status`,
          currentStatus: device.data?.enrollment?.status
        });
        return;
      }

      // 3. Get enrollment data from ProtoMemDB
      const platform = device.data?.enrollment?.metadata?.platform || device.platform;
      const memdb = ProtoMemDB('enrollments');
      const enrollmentData = memdb.get('pending', platform, deviceName);

      if (!enrollmentData) {
        logger.warn({ deviceName, platform }, 'Enrollment data not found in ProtoMemDB, but device is pending');
        // Continue anyway - we can still approve based on device data
      }

      // 4. Update device with approved status and apply subsystems/credentials
      const updatePayload: any = {
        ...device,
        data: {
          ...device.data,
          enrollment: {
            ...device.data.enrollment,
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: session.user.email || session.user.id
          }
        }
      };

      // Apply subsystems if available in enrollment data
      if (enrollmentData?.subsystems) {
        updatePayload.subsystem = enrollmentData.subsystems;
      }

      // Apply credentials if available in enrollment data
      if (enrollmentData?.credentials) {
        updatePayload.credentials = enrollmentData.credentials;
      }

      // 5. Update device via API
      await API.post(`/api/core/v1/devices/${encodeURIComponent(deviceName)}?token=${token}`, updatePayload);

      // 6. Clean up ProtoMemDB
      if (enrollmentData) {
        removeEnrollment(platform, deviceName);
      }

      // 7. Emit approval event
      await generateEvent({
        path: `devices/enrollment/approved/${deviceName}`,
        from: 'system',
        user: session.user.email || session.user.id,
        payload: {
          deviceName,
          platform,
          approvedBy: session.user.email || session.user.id,
          approvedAt: updatePayload.data.enrollment.approvedAt
        }
      }, token);

      // 8. Trigger regeneration of device board/cards/actions
      try {
        await API.get(`/api/core/v1/devices/${encodeURIComponent(deviceName)}/regenerateBoard?token=${token}`);
        logger.info({ deviceName }, 'Board regenerated after enrollment approval');
      } catch (boardErr: any) {
        logger.error({ deviceName, err: boardErr }, 'Failed to regenerate board after approval');
        // Don't fail the approval if board generation fails
      }

      logger.info({ deviceName, platform, approvedBy: session.user.email }, 'Device enrollment approved');

      res.send({
        message: 'Device enrollment approved',
        deviceName,
        platform,
        status: 'approved'
      });
    } catch (err: any) {
      logger.error({ deviceName, err }, 'Failed to approve device enrollment');
      res.status(500).send({
        error: 'Failed to approve device enrollment',
        details: err.message
      });
    }
  }));

  /**
   * POST /api/core/v1/devices/enrollments/:deviceName/reject
   * Reject a pending device enrollment
   */
  app.post('/api/core/v1/devices/enrollments/:deviceName/reject', handler(async (req, res, session) => {
    hasPermission(session, 'enrollments.reject')

    const deviceName = req.params.deviceName;
    const deleteDevice = req.body?.deleteDevice !== false; // Default to true
    const token = getServiceToken();

    try {
      // 1. Fetch device from API
      const deviceRes = await API.get(`/api/core/v1/devices/${encodeURIComponent(deviceName)}?token=${token}`);

      if (deviceRes.isError || !deviceRes.data) {
        res.status(404).send({ error: `Device ${deviceName} not found` });
        return;
      }

      const device = deviceRes.data;

      // 2. Verify device is in pending status
      if (device.data?.enrollment?.status !== 'pending') {
        res.status(400).send({
          error: `Device ${deviceName} is not in pending status`,
          currentStatus: device.data?.enrollment?.status
        });
        return;
      }

      const platform = device.data?.enrollment?.metadata?.platform || device.platform;

      // 3. Clean up ProtoMemDB
      removeEnrollment(platform, deviceName);

      // 4. Either delete the device or update its status to rejected
      if (deleteDevice) {
        await API.get(`/api/core/v1/devices/${encodeURIComponent(deviceName)}/delete?token=${token}`);

        logger.info({ deviceName, platform, rejectedBy: session.user.email }, 'Device enrollment rejected and device deleted');

        res.send({
          message: 'Device enrollment rejected and device deleted',
          deviceName,
          platform,
          status: 'deleted'
        });
      } else {
        // Update device with rejected status
        const updatePayload = {
          ...device,
          data: {
            ...device.data,
            enrollment: {
              ...device.data.enrollment,
              status: 'rejected',
              rejectedAt: new Date().toISOString(),
              rejectedBy: session.user.email || session.user.id
            }
          }
        };

        await API.post(`/api/core/v1/devices/${encodeURIComponent(deviceName)}?token=${token}`, updatePayload);

        logger.info({ deviceName, platform, rejectedBy: session.user.email }, 'Device enrollment rejected');

        res.send({
          message: 'Device enrollment rejected',
          deviceName,
          platform,
          status: 'rejected'
        });
      }

      // 5. Emit rejection event
      await generateEvent({
        path: `devices/enrollment/rejected/${deviceName}`,
        from: 'system',
        user: session.user.email || session.user.id,
        payload: {
          deviceName,
          platform,
          rejectedBy: session.user.email || session.user.id,
          deleted: deleteDevice
        }
      }, token);

    } catch (err: any) {
      logger.error({ deviceName, err }, 'Failed to reject device enrollment');
      res.status(500).send({
        error: 'Failed to reject device enrollment',
        details: err.message
      });
    }
  }));

  /**
   * GET /api/core/v1/devices/enrollments/:deviceName/status
   * Get enrollment status for a device
   */
  app.get('/api/core/v1/devices/enrollments/:deviceName/status', handler(async (req, res, session) => {
    hasPermission(session, 'enrollments.read')

    const deviceName = req.params.deviceName;
    const token = getServiceToken();

    try {
      // Fetch device from API
      const deviceRes = await API.get(`/api/core/v1/devices/${encodeURIComponent(deviceName)}?token=${token}`);

      if (deviceRes.isError || !deviceRes.data) {
        res.status(404).send({ error: `Device ${deviceName} not found` });
        return;
      }

      const device = deviceRes.data;
      const enrollment = device.data?.enrollment || { status: 'unknown' };

      res.send({
        deviceName,
        enrollment
      });
    } catch (err: any) {
      logger.error({ deviceName, err }, 'Failed to get enrollment status');
      res.status(500).send({
        error: 'Failed to get enrollment status',
        details: err.message
      });
    }
  }));
};
