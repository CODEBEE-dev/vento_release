import {
    Router,
    Key,
    Cog,
    Database,
    Boxes,
    Box,
    LayoutDashboard,
    Zap,
    HelpingHand,
    Blocks,
    Palette
} from '@tamagui/lucide-icons'
import { MonitorCog as RawMonitorCog } from 'lucide-react'
import { styled } from 'tamagui'

const MonitorCog = styled(RawMonitorCog, {
    name: 'MonitorCog',
    size: '$true',
    color: 'currentColor',
})

export default ({ boards, objects }) => {
    const objectsWithPage = objects ? objects.filter(o => o?.features?.adminPage) : []

    const manageBoards = { "name": "Manage Boards", "icon": MonitorCog, "href": '/workspace/boards' }

    const objectsMenu = objectsWithPage.length ? objectsWithPage.map((obj) => {
        return { "name": obj.name.charAt(0).toUpperCase() + obj.name.slice(1), "icon": Box, "href": ('/workspace/') + obj.features.adminPage }
    }) : [];

    objectsMenu.push({ "name": "Manage Storage", "icon": Boxes, "href": "/workspace/objects" })
    const initialData = {
        Boards: [],
        Storage: objectsMenu,
    }

    const boardsGroupByCategory = boards ? boards.reduce((acc, board) => {
        const category = board.category || 'Boards';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push({ "name": (board.displayName ?? board.name).charAt(0).toUpperCase() + (board.displayName ?? board.name).slice(1), "icon": board.icon ?? LayoutDashboard, "href": '/workspace/boards/view?board=' + (board.name) });
        return acc;
    }, initialData) : initialData;

    boardsGroupByCategory['Boards'].push(manageBoards);

    return {
        "default": "/workspace/",
        "label": "Admin panel",
        "assistant": true,
        "logs": true,
        "menu": {
            ...boardsGroupByCategory,
        }
    }
}
