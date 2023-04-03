//import { getFirestoreInstance } from './utils';
import * as fs from "fs"
import * as admin from "firebase-admin"
import { getAuthInstance, getCredentials } from "../utils/utils"

async function main() {
    const args = process.argv.slice(2)

    if (args.length < 0) {
        console.log("Usage: pnpm auth-export <credentialsDir> [<filename.json>] [<batch_size>]")
        console.log(
            "   <credentialsDir>: name of directory inside credentials/ to load credential from (e.g. 'local' or 'staging' or 'prod')"
        )
        console.log("   <filename.json>: (optional) output filename (defaults to ./users.json")
        console.log("   <batch_size>: (optional) number of users to fetch at a time (defaults to 100)")
        process.exit(1)
    }
    const { firebaseServiceAccount, supabaseServiceAccount, credentialsDir } = getCredentials()

    const filename = args[1] || "./users.json"
    const dirPath = `../../exported/${credentialsDir}/auth`
    fs.mkdirSync(dirPath, { recursive: true })
    const filePath = `${dirPath}/${filename}`
    fs.rmSync(filePath, { force: true })
    const batchSizeInput = args[2] || "100"
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

main()
