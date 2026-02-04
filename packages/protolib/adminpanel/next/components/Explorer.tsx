import { YStack } from '@tamagui/stacks';
import Dropzone from 'react-dropzone'
import { useThemeSetting } from '@tamagui/next-theme'
import { setChonkyDefaults } from 'chonky';
import { ChonkyIconFA } from 'chonky-icon-fontawesome';
import { FileNavbar, FileBrowser, FileToolbar, FileList, ChonkyActions } from 'chonky';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, Paragraph, useTheme, Text, SizableText, Stack, XStack } from '@my/ui';
import { Uploader } from './Uploader';
import { Download } from '@tamagui/lucide-icons'
import { createApiAtom } from '../../../lib/createApiAtom';
import { useAtom } from '../../../lib/Atom';
import { AlertDialog } from '../../../components/AlertDialog';
import { API } from 'protobase';
import { Tinted } from '../../../components/Tinted';
import { getLogger } from "protobase"
import { useHasPermission } from '../../../lib/usePermission'

const logger = getLogger()


setChonkyDefaults({ iconComponent: ChonkyIconFA });
const filesAtom = createApiAtom([])

export const Explorer = ({ currentPath, customActions, onOpen, onChangeSelection, selection, filesState, fileFilter = () => true, ...props }: any) => {
    const theme = useTheme()
    const fileBrowserRef = useRef<any>()

    // Check file permissions
    const canCreate = useHasPermission('files.create')
    const canDelete = useHasPermission('files.delete')
    const canUpdate = useHasPermission('files.update')
    const borderColor = theme.color.val.replace(/^#/, '%23')
    const [files, setFiles] = useAtom(filesAtom, filesState)
    const [showDropMessage, setShowDropMessage] = useState(false)
    const [showUploadDialog, setShowUploadDialog] = useState(false)
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
    const [openDownloadDialog, setOpenDownloadDialog] = useState(false)
    const [selected, setSelected] = useState([])
    const [customAction, setCustomAction] = useState(null)
    const lastClickInfo = useRef({ id: null, time: 0 })
    const normalizedCurrentPath = currentPath && currentPath.startsWith("/") ? currentPath : (currentPath ? "/" + currentPath : '/')

    const findSelected = () => files.data?.find?.(f => f.path == selection)

    const selectedFiles = selection && findSelected() ? [findSelected()] : selected
    const setSelectedFiles = onChangeSelection ?? setSelected

    const refreshFiles = useCallback(async () => {
        const ts = Date.now();
        const fetchPath = (normalizedCurrentPath || '/').replace(/^\/+/, '');
        const res = (await API.get('/api/core/v1/files/' + fetchPath + '?ts=' + ts)) ?? { data: [] };
        setFiles(res);
        props?.onFileActionEvent && props.onFileActionEvent?.({id: "refresh_files", payload: { path: fetchPath }})
    }, [normalizedCurrentPath, setFiles]);

    const onUploadFiles = async () => {
        await refreshFiles()
    }
    const onScroll = () => { }
    // Filter custom actions based on permissions
    // Actions with id containing 'make' (makedir, makefile) require create permission
    // Actions with id 'rename' require update permission
    const filteredCustomActions = customActions.filter(f => {
        if (!f.filter || f.filter(normalizedCurrentPath, selectedFiles)) {
            const actionId = f.action?.id || ''
            if (actionId.includes('make') || actionId.includes('create')) return canCreate
            if (actionId === 'rename') return canUpdate
            return true // Default to showing action (read-only like getPublicLink)
        }
        return false
    })

    const myFileActions = [
        ...filteredCustomActions.map(f => f.action),
        ...(canCreate ? [ChonkyActions.UploadFiles] : []),
        // ChonkyActions.EnableCompactView
        // ChonkyActions.CreateFolder
        ChonkyActions.DownloadFiles,
        ...(canDelete ? [ChonkyActions.DeleteFiles] : [])
    ];

    const actionsToDisable: string[] = [
        ChonkyActions.SelectAllFiles.id,
        ChonkyActions.ClearSelection.id,
        ChonkyActions.OpenSelection.id
    ];
    const { resolvedTheme } = useThemeSetting()

    const parsedFiles = files && files.data ? files.data?.filter?.(fileFilter).map((f: any) => {
        return {
            ...f,
            thumbnailUrl: (f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg')) ? '/api/core/v1/files/' + f.path : undefined,
            ...(props.getExtendedFileProps ? props.getExtendedFileProps(f) : {}),
        }
    }) : []

    const folderChain = [{ id: '/', name: "Files", isDir: true }].concat(
        ...normalizedCurrentPath.split('/').map((x: any, i: any, arr: any) => {
            return {
                name: x,
                id: arr.slice(0, i + 1).join('/'),
                isDir: true
            };
        })
    )

    const onAddFiles = (acceptedFiles: any) => {
        logger.info({ files: acceptedFiles }, "Uploaded files")
        setShowUploadDialog(true)
        setShowDropMessage(false)
    }

    const onDeleteFiles = (data: any) => {
        const filesToDelete = data.state.selectedFilesForAction.map(file => ({
            name: file.name,
            isDirectory: file.isDir
        }));
        setSelectedFiles(filesToDelete)
        setOpenDeleteDialog(true)
    }

    const onDownloadFiles = (data: any) => {
        const filesToDownload = data.state.selectedFilesForAction.map(f => f.name)
        if (!filesToDownload.length) return
        if (filesToDownload.length == 1) {
            window.open("/api/core/v1/files/" + currentPath + '/' + filesToDownload[0] + '?download=1', '_new')
        } else {
            setSelectedFiles(filesToDownload)
            setOpenDownloadDialog(true)
        }
    }

    useEffect(() => {
        if (filesState.isLoaded) {
            refreshFiles()
        }
    }, [filesState])

    useEffect(() => {
        // TODO: Refactor this to use a better way to set initial selection
        if (files.isLoaded) {
            const selectedInFolder = findSelected()

            if (selectedInFolder && fileBrowserRef.current?.setFileSelection) {
                fileBrowserRef.current.setFileSelection([selectedInFolder.id])
            }
        }
    }, [files])

    useEffect(() => {
        const ssePath = (normalizedCurrentPath || '/').replace(/^\/+/, '');
        const url = `/api/core/v1/files/events?path=${encodeURIComponent(ssePath)}&depth=0`;
        const es = new EventSource(url);

        es.onmessage = (e) => {
            try {
                const evt = JSON.parse(e.data);
                if (evt.path === ssePath) {
                    refreshFiles();
                }
            } catch { }
        };

        return () => es.close();
    }, [normalizedCurrentPath, refreshFiles]);


    return (
        <Dropzone
            onDragEnter={() => setShowUploadDialog(true)}
            noClick={true}
            onDrop={onAddFiles}
            //@ts-ignore
            onUpload={onAddFiles}
        >
            {({ getRootProps, getInputProps }) => (
                //@ts-ignore
                <YStack flex={1} {...getRootProps()} >
                    <AlertDialog
                        p="$5"
                        maxHeight={'80vh'}
                        acceptCaption="Close"
                        setOpen={setOpenDownloadDialog}
                        open={openDownloadDialog}
                        hideAccept={true}
                        title={<Tinted><Text color="$color7">Download</Text></Tinted>}
                        description="Use those links to download:"
                    >
                        <YStack
                            f={1}
                            overflow={'scroll'}
                            //@ts-ignore
                            overflowX={'hidden'}
                        >
                            {selectedFiles.map((f, id) => <a key={id} href={"/api/core/v1/files/" + currentPath + '/' + f + '?download=1'} target="_new">
                                <XStack mb="$2" br="$radius.12" p="$2" px="$4" backgroundColor={"$color4"} hoverStyle={{ backgroundColor: "$color6", o: 1 }} o={0.7} ai="center" jc="center">
                                    <Download />
                                    <SizableText ml="$2">{f}</SizableText>
                                </XStack>
                            </a>)}
                        </YStack>
                    </AlertDialog>
                    <AlertDialog
                        acceptButtonProps={{ color: "white", backgroundColor: "$red9" }}
                        p="$5"
                        acceptCaption="Delete"
                        setOpen={setOpenDeleteDialog}
                        open={openDeleteDialog}
                        onAccept={async (seter) => {
                            const itemsToDelete = selectedFiles
                            await API.post('/api/core/v1/deleteItems/' + currentPath, itemsToDelete);
                            refreshFiles()
                        }}
                        acceptTint="red"
                        title={<Text color="$red9">Delete{(selectedFiles.length > 1 ? ' ' + selectedFiles.length + ' files?' : '?')}</Text>}
                        description={"The following files will be deleted:"}
                    >
                        <YStack f={1}>
                            {selectedFiles.map(f => <Paragraph>{f.name}</Paragraph>)}
                        </YStack>
                    </AlertDialog>

                    <AlertDialog
                        onPress={(e) => { e.stopPropagation() }}
                        p="$5"
                        acceptCaption="Close"
                        setOpen={setCustomAction}
                        open={customAction}
                        hideAccept={true}
                        title={<Tinted><Text color="$color7">{customAction?.title}</Text></Tinted>}
                        description={customAction?.description}
                    >
                        <YStack minWidth={customAction?.size?.width} h={customAction?.size?.height} f={1}>
                            {customAction && customAction.getComponent && customAction.getComponent(
                                selectedFiles,
                                normalizedCurrentPath,
                                setCustomAction,
                                async () => await refreshFiles()
                            )}
                        </YStack>

                    </AlertDialog>

                    <YStack f={1}>
                        <input {...getInputProps()} />
                        <Tinted>
                            <FileBrowser
                                ref={fileBrowserRef}
                                disableDragAndDrop={true}
                                disableDefaultFileActions={actionsToDisable}
                                //defaultFileViewActionId={ChonkyActions.ToggleHiddenFiles.id} 
                                disableSelection={false}
                                darkMode={resolvedTheme == 'dark'}
                                files={parsedFiles}
                                folderChain={folderChain}
                                fileActions={myFileActions}
                                onFileAction={(data) => {
                                    props?.onFileActionEvent && props.onFileActionEvent?.(data)
                                    if (props.fileActionCheck && typeof props.fileActionCheck === 'function') {
                                        const actionCheck = props.fileActionCheck(data);
                                        if (actionCheck === false) return
                                    }
                                    if (data.id == 'open_files') {
                                        onOpen(data.payload.targetFile)
                                    } else if (data.id == 'upload_files') {
                                        setShowUploadDialog(true)
                                    } else if (data.id == 'delete_files') {
                                        onDeleteFiles(data)
                                    } else if (data.id == 'download_files') {
                                        onDownloadFiles(data)
                                    } else if (data.id === "change_selection") {
                                        setSelectedFiles(data.state.selectedFiles)//.map(f => f.name))
                                    } else if (data.id == 'mouse_click_file') {
                                        //this is a hack because rerenders clear the timer for double click in chonky
                                        //This produces a bug where folders can not be opened if a rerender is done while double click
                                        //We open files whit mouse click file and our own timer for double click
                                        if ((Math.abs(Date.now() - lastClickInfo.current.time) < 750) && data.payload.file.id == lastClickInfo.current.id) {
                                            lastClickInfo.current = { id: null, time: 0 }
                                            onOpen(data.payload.file)
                                            props.onFileActionEvent && props.onFileActionEvent?.({ ...data, id: 'open_files' })
                                        } else {
                                            lastClickInfo.current.time = Date.now()
                                            lastClickInfo.current.id = data.payload.file.id
                                        }
                                    } else {
                                        const customAction = customActions.find(action => action.action.id == data.id)
                                        if (customAction) {
                                            setCustomAction(customAction)
                                        }
                                        logger.info({ data }, "File action")
                                    }
                                }}
                                {...props}
                            >
                                {!props.disableNavBar && <FileNavbar />}
                                {!props.disableFileToolbar && <FileToolbar />}
                                <FileList onScroll={onScroll} />
                                {/* <FileContextMenu/> */}
                            </FileBrowser>
                        </Tinted>


                        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                            <Dialog.Portal>
                                <Dialog.Overlay />
                                <Dialog.Content overflow="hidden" p={0} backgroundColor={resolvedTheme == 'dark' ? "#1e1e1e" : 'white'} height={'600px'} width={"600px"} >
                                    <Uploader path={currentPath} onUpload={onUploadFiles} setShowUploadDialog={setShowUploadDialog} />
                                    <Dialog.Close />
                                </Dialog.Content>
                            </Dialog.Portal>

                            {/* optionally change to sheet when small screen */}
                            <Dialog.Adapt when="sm">
                                <Dialog.Sheet>
                                    <Dialog.Sheet.Frame>
                                        <Dialog.Adapt.Contents />
                                    </Dialog.Sheet.Frame>
                                    <Dialog.Sheet.Overlay />
                                </Dialog.Sheet>
                            </Dialog.Adapt>
                        </Dialog>
                    </YStack>
                </YStack>
            )}
        </Dropzone>
    )
}