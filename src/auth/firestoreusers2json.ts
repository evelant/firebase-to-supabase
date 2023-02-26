//import { getFirestoreInstance } from './utils';
import * as fs from "fs"
import * as admin from "firebase-admin"
import { getAuthInstance } from "../utils/utils"

const args = process.argv.slice(2)

if (args.length < 0) {
    console.log("Usage: node firestoreusers2json.js [<filename.json>] [<batch_size>]")
    console.log("   <filename.json>: (optional) output filename (defaults to ./users.json")
    console.log("   <batch_size>: (optional) number of users to fetch at a time (defaults to 100)")
    process.exit(1)
} else {
    main()
}

async function main() {
    const filename = args[0] || "./users.json"
    const dirPath = `../../exported/auth`
    fs.mkdirSync(dirPath, { recursive: true })
    const filePath = `${dirPath}/${filename}`
    const batchSizeInput = args[1] || "100"
    const batchSize = parseInt(batchSizeInput)
    fs.writeFileSync(filePath, "[", "utf-8")
    listUsers(filePath, batchSize, true)
}

async function listUsers(filename: string, batchSize: number, firstBatch: boolean, nextPageToken?: string) {
    let count = 0
    getAuthInstance()
        .listUsers(batchSize, nextPageToken)
        .then((usersFound: admin.auth.ListUsersResult) => {
            const users: admin.auth.UserRecord[] = usersFound.users

            users.forEach((user: admin.auth.UserRecord) => {
                fs.appendFileSync(
                    filename,
                    (firstBatch && count < 1 ? "" : ",") + JSON.stringify(user, null, 2),
                    "utf-8"
                )
                count += 1
            })
            if (usersFound.pageToken) {
                listUsers(filename, batchSize, false, usersFound.pageToken)
            } else {
                fs.appendFileSync(filename, "]\n", "utf-8")
            }
        })
        .catch(err => {
            console.log("ERROR in listUsers", JSON.stringify(err))
        })
}
