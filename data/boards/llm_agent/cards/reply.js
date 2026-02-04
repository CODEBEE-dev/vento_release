const jobRes = context.boards.getVar("job_" + params.resquestId, true);

if (!jobRes) {
  throw "Unable to send reply: Empty res object in current job.";
}
jobRes.send(params.response);

return params