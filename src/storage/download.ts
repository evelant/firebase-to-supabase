import { existsSync, mkdirSync } from "fs"
import { getBucketName, getCredentials, getStorageInstance } from "../utils/utils"

const args = process.argv.slice(2)
if (args.length < 1) {
    console.log(
        "Usage: pnpm firebase-storage-export <credentialsDir> <prefix> [<folder>] [<batchSize>] [<limit>] [<token>]"
    )
    console.log(
        "   <credentialsDir>: name of directory inside credentials/ to load credential from (e.g. 'local' or 'staging' or 'prod')"
    )
    console.log("       <prefix>: the prefix of the files to download")
    console.log('                 to process the root bucket use prefix ""')
    console.log('       <folder>: (optional), name of subfolder for downloaded files, default is "downloads"')
    console.log("       <batchSize>: (optional), default is 100")
    console.log("       <limit>: (optional), stop after processing this many files")
    console.log("       <token>: (optional), begin processing at this pageToken")
    process.exit(1)
}
const { credentialsDir, firebaseServiceAccount, supabaseServiceAccount } = getCredentials()
const prefix = args[1]
let batchSize: number
let limit: number = 0
let count: number = 0
let downloaded: number = 0
let token: string = ""
let folder: string = "downloads"
/*

{
  prefix: '',
  autoPaginate: false,
  maxResults: 100,
  pageToken: 'xxxxxxxxxxxxxxxxxxxx'
}

*/
// GetFilesOptions:
// https://googleapis.dev/nodejs/storage/latest/global.html#GetFilesOptions
//
try {
    if (args[2]) {
        folder = args[2]
    }
    // check if folder is a valid folder name
    if (!folder.match(/^[a-zA-Z0-9_\-]+$/)) {
        console.log("folder name must be alphanumeric")
        process.exit(1)
    }
    if (!existsSync(`./${folder}`)) {
        mkdirSync(`./${folder}`)
    }
} catch (err) {
    console.error("error creating ./downloads folder:")
    console.error(err)
    process.exit(1)
}

try {
    batchSize = parseInt(args[3] || "100")
} catch (err) {
    console.error("error setting batchSize:")
    console.error(err)
    process.exit(1)
}
try {
    limit = parseInt(args[4] || "0")
} catch (err) {
    console.error("error setting limit:")
    console.error(err)
    process.exit(1)
}
try {
    if (args[5]) {
        token = args[5]

        if (token.length !== 64) {
            console.error("token must be 20 characters long")
            process.exit(1)
        }
    }
} catch (err) {
    console.error("error in token:")
    console.error(err)
    process.exit(1)
}

const storage = getStorageInstance()

async function processBatch(fileSet: File[], queryForNextPage: any) {
    if (fileSet.length > 0) {
        const file = fileSet.shift()
        if (!file) throw new Error(`processBatch: fileSet.shift() returned undefiined`)
        try {
            console.log("downloading: ", file.name)
            const [err] = await storage
                .bucket(getBucketName(firebaseServiceAccount))
                .file(file.name)
                .download({
                    destination: `./${folder}/${encodeURIComponent(file.name)}`,
                })
            if (err) {
                console.error("Error downloading file", err)
            } else {
                downloaded++
            }
            processBatch(fileSet, queryForNextPage)
        } catch (err) {
            console.log("err", err)
        }
    } else {
        if (queryForNextPage && (limit === 0 || count < limit)) {
            getBatch(queryForNextPage)
        } else {
            console.log(`done: downloaded ${downloaded} files`)
            process.exit(0)
        }
    }
}

async function getBatch(query: any) {
    const fileSet: File[] = []
    const [files, queryForNextPage] = await storage.bucket(getBucketName(firebaseServiceAccount)).getFiles(query)
    let c = 0
    console.log("processing page: ", (queryForNextPage as any)?.pageToken! || "<starting page>")
    files.forEach(async function (file) {
        if (!file.name.endsWith("/")) {
            // skip folders
            count++
            c++
            if (limit === 0 || count <= limit) {
                fileSet.push(file as any)
            }
        }
    })
    // console.log('prepared batch of ', fileSet.length, ' files')
    processBatch(fileSet, queryForNextPage)
}

async function main() {
    const startQuery = {
        prefix: prefix,
        autoPaginate: false,
        maxResults: batchSize,
        pageToken: token,
    }
    getBatch(startQuery)
}
main()
