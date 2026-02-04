import { useLog, levelTable } from '../hooks/useLog'
import { useToastController } from '@my/ui'

const logsColors: any = {
    error: "red",
    warn: "yellow",
    info: "blue",
    debug: "green",
    trace: "purple",
    fatal: "pink"
}

export const UILogs = () => {
    const toast = useToastController()
   
    useLog((log) => {
        const level = log?.topic.split("/")[2]
        const levelIndexTable = Object.keys(levelTable).reduce((obj, key) => { obj[levelTable[key]] = key; return obj }, {} as any)
        const type = levelIndexTable[level]
        const parsed = log?.parsed
        
        if (parsed?.audience == "ui") {
            let title
            
            let options: any = {
                duration: 3000,
            }

            if (type && logsColors[type]) {
                options["tint"] = logsColors[type] as any
            }
            if (parsed.msg) {
                title = parsed.msg
                toast.show(title, {
                    ...options
                })
            }
        }
    })
    return <div style={{ position: "absolute", zIndex: 999 }}></div>
}