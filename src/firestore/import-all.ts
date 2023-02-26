import { getFirestoreCollectionNames } from "../utils/utils"
import { buildImportArgs, importCollection } from "./import-collection"

const main = async () => {
    const names = await getFirestoreCollectionNames()
    console.log(`Importing ${names.length} collections`)
    for (const name of names) {
        console.log(`\n\nImporting collection "${name}"`)
        const importArgs = await buildImportArgs(name, "firestore_id", "id")
        const importResult = await importCollection(importArgs)
    }
}
main()
