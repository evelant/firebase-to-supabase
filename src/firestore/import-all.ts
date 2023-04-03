import { getCredentials, getFirestoreCollectionNames, getPgClient } from "../utils/utils"
import { buildImportArgs, importCollection } from "./import-collection"
import * as fs from "fs"

const main = async () => {
    const { supabaseServiceAccount } = getCredentials()
    const args = process.argv.slice(2)
    const importFromDir = args[1]
    if (!importFromDir || !fs.existsSync(`../../exported/firestore/${importFromDir}`)) {
        console.log(
            `Usage: pnpm firestore-import-all <target environment credentials dir> <folder under exported/firestore to import from>`
        )
        process.exit(1)
    }

    const names = await getFirestoreCollectionNames()
    console.log(`Importing ${names.length} collections`)
    for (const name of names) {
        console.log(`\n\nImporting collection "${name}"`)
        try {
            const importArgs = await buildImportArgs(name, importFromDir, "firestore_id", "id")
            const importResult = await importCollection(importArgs)
            // await importArgs.client.end()
        } catch (err: any) {
            console.error(`Error importing collection "${name}"`, err)
        }
    }
    console.log(`Finished importing ${names.length} collections`)
    await (await getPgClient(supabaseServiceAccount)).end()
    console.log(`Closed connection to Postgres`)
}
main()
