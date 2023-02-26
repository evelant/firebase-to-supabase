# Firebase to Supabase: Storage Migration

This module automates the process of converting storage files from Firebase Storage to Supabase Storage.

Conversion is a two-step process:

1. Files are downloaded from a Firebase storage bucket to a local fielsystem.
2. Files are uploaded form a local filesystem to a Supabase storage bucket.

### Configuration

#### Download your `firebase-service.json` file from the Firebase Console

-   log into your Firebase Console
-   open your project
-   click the gear icon to the right of `Project Overview` at the top left, then click `Project Settings`
-   click `Service Accounts` at the center of the top menu
-   select `Firebase Admin SDK` at the left then click the `Generate new private key` button on the right (bottom)
-   click `Generate key`
-   save the file to the `firebase-to-supabase/credentials` folder
-   rename the downloaded file to `firebase-service.json`

#### Set up your `supabase-keys.json` file

-   copy or rename `credentials/supabase-keys-sample.json` to `credentials/supabase-keys.json`
-   edit the `supabase-keys.json` file:
    -   log in to [app.supabase.io](https://app.supabase.io) and open your project
    -   click the `settings` (gear) icon at the bottom of the left menu
    -   click `API` from the `Settings Menu`
    -   scroll down and find your `URL` under `Config`, copy that to the `SUPABASE_URL` entry in your `supabase-keys.json` file.
    -   under `Project API keys`, click on `Reveal` to reveal your `service_role secret`. Copy that value to the `SUPABASE_KEY` entry in your `supabase-keys.json` file.
    -   save the `supabase-keys.json` file

### Command Line Syntax

#### Download Firestore Storage Bucket to a local filesystem folder

`node download.js <prefix> [<folder>] [<batchSize>] [<limit>] [<token>]`

-   `<prefix>`: the prefix of the files to download to process the root bucket use an empty prefix: ""
-   `<folder>`: (optional), name of subfolder for downloaded files, default is "downloads"
    **note**: the selected folder will be created as a subfolder of the current folder, i.e. `./downloads/`
-   `<batchSize>`: (optional), default is 100
-   `<limit>`: (optional), stop after processing this many files
    **note**: for no limit, use: 0
-   `<token>`: (optional), begin processing at this pageToken

To process in batches using multiple command-line executions, you must use the same parameters with a new `<token>` on subsequent calls. (Use the token displayed on the last call to continue the process at a given point.)

#### Upload files from local filesystem folder to Supabase Storage Bucket

`node upload.js <prefix> <folder> <bucket>`

-   `<prefix>`: the prefix of the files to download to process all files use an empty prefix: ""
-   `<folder>`: name of subfolder of files to upload, default is "downloads"

**note**: the selected folder will be read as a subfolder of the current folder, i.e. `./downloads/`

-   `<bucket>`: name of bucket to upload to

**note**: if the bucket does not exist it will be created as a `non-public` bucket

**note 2**: you will need to set permissions on this new bucket in the Supabase dashboard before users will have access to download any files in a newly-created bucket
