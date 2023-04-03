import { getCredentials, getFirestoreCollectionNames } from "../utils/utils"
import { exportEntireCollection, exportFromCollection } from "./firestore-export"

const main = async () => {
    const { credentialsDir } = getCredentials()
    const names = await getFirestoreCollectionNames()
    console.log(`Exporting ${names.length} collections`)
    for (const name of names) {
        console.log("\n\n")
        await exportEntireCollection(name, credentialsDir)
        console.log("\n\n")
    }
}
main()
