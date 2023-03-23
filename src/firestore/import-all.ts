import { getFirestoreCollectionNames, getPgClient } from "../utils/utils"
import { buildImportArgs, importCollection } from "./import-collection"

const main = async () => {
    const names = await getFirestoreCollectionNames()
    console.log(`Importing ${names.length} collections`)
    for (const name of names) {
        console.log(`\n\nImporting collection "${name}"`)
        try {
            const importArgs = await buildImportArgs(name, "firestore_id", "id")
            const importResult = await importCollection(importArgs)
            // await importArgs.client.end()
        } catch (err: any) {
            console.error(`Error importing collection "${name}"`, err)
        }
    }
    console.log(`Finished importing ${names.length} collections`)
    await (await getPgClient()).end()
    console.log(`Closed connection to Postgres`)
}
main()
