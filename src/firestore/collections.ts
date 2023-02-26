import { getFirestoreCollectionNames } from "../utils/utils"

async function main() {
    const names = await getFirestoreCollectionNames()
    console.log(`Firestore collections: ${names.length}`)
    names.forEach(n => console.log(n))
}
main()
