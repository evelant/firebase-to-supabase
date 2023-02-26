import { getFirestoreCollectionNames } from "../utils/utils"
import { exportEntireCollection, exportFromCollection } from "./firestore2json"

const main = async () => {
    const names = await getFirestoreCollectionNames()
    console.log(`Exporting ${names.length} collections`)
    for (const name of names) {
        console.log("\n\n")
        await exportEntireCollection(name)
        console.log("\n\n")
    }
}
main()
