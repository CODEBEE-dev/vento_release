const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')


// Generate TOKEN_SECRET if not present
const content = 'TOKEN_SECRET=' + require('crypto').randomBytes(64).toString('hex') + "\n"
if (!fs.existsSync('./../../.env')) {
    fs.writeFileSync('./../../.env', content)
} else {
    const fileContent = fs.readFileSync('./../../.env').toString()
    if (!fileContent.includes('TOKEN_SECRET')) {
        fs.appendFileSync('./../../.env', content)
    }
}


// Compile if index.js doesn't exist
const bundlePath = path.join(__dirname, 'index.js')
if (!fs.existsSync(bundlePath)) {
    console.log("Compiling vento app...")

    const child = spawn('yarn', ['package'], {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname
    })

    child.on('error', (err) => {
        console.error('Failed to compile vento:', err)
        process.exit(1)
    })

    child.on('close', (code) => {
        if (code !== 0) {
            console.error(`Vento compilation failed with code ${code}`)
            process.exit(code)
        }
    })
} else {
    console.log("Vento already compiled, skipping build.")
}
