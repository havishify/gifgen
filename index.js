const { existsSync } = require("node:fs");
const { mkdir, readdir, rename, open } = require("node:fs/promises");
const { spawn } = require("node:child_process");

const pathFfmpeg = "./ffmpeg/ffmpeg.exe";
const pathInputFolder = "./input/";
const pathOutputFile = "./output.gif";
const pathOldOutputsFolder = "./old_outputs"
const pathConfigTxt = "./config.txt";

async function main() {
    return new Promise(async (resolve, reject) => {
        if (!existsSync(pathInputFolder)) {
            reject(new Error('Input folder is not exists.'));
            return;
        }
        
        if (existsSync(pathOutputFile)) {
            if (!existsSync(pathOldOutputsFolder)) {
                await mkdir(pathOldOutputsFolder);
            }

            const index = (await readdir(pathOldOutputsFolder)).length + 1;

            await rename(pathOutputFile, `${pathOldOutputsFolder}/${index}.gif`);
        }

        const configFile = await open(pathConfigTxt);

        let framerate, stopDuration;

        for await (const line of configFile.readLines()) {
            const [name, value] = line.split('=');
            
            switch (name) {
                case 'framerate':
                    framerate = Number(value);
                    break;
                case 'stop_duration':
                    stopDuration = Number(value);
                    break;
            }
        }

        console.log(framerate, stopDuration);

        const ls = spawn(pathFfmpeg, [
            '-framerate', framerate,
            '-i', 'input/%d.png',
            '-vf', `tpad=stop_mode=clone:stop_duration=${stopDuration},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=bayer`,
            pathOutputFile
        ]);

        ls.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        ls.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        ls.on('close', (code) => {
            console.log(`child process exited with code ${code}`);

            resolve();
        });
    });
}

main().catch(console.error);