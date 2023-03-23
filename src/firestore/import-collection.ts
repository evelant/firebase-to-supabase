import { Client } from "pg"
import StreamArray from "stream-json/streamers/StreamArray"
import * as fs from "fs"
import { getPgClient } from "../utils/utils"

function quit() {
    process.exit(1)
}

export interface ImportCollectionArgs {
    filename: string
    client: Client
    tableName: string
    fields: { [key: string]: string }
    primary_key_name: string
    primary_key_strategy: string
}
export const buildImportArgs = async (
    collectionName: string,
    primary_key_strategy: string = "none",
    primary_key_name: string = "id"
): Promise<ImportCollectionArgs> => {
    const filename = `../../exported/firestore/${collectionName}.json`
    if (!fs.existsSync(filename)) throw new Error(`file "${filename}" does not exist`)
    const client: Client = await getPgClient()
    const fields = await parseFieldsFromJSONFile(filename)
    if (fields[primary_key_name]) {
        console.log(
            `primary key field ${primary_key_name} already exists in ${filename}, ignoring it for import (will use primary_key_strategy for field instead)`
        )
        delete fields[primary_key_name]
    }
    const tableName = filename.replace(/\\/g, "/").split("/").pop()?.split(".")[0].replace(".json", "")
    if (!tableName) throw new Error(`unable to parse table name from ${filename}`)

    return {
        client,
        filename,
        fields,
        tableName,
        primary_key_strategy,
        primary_key_name,
    }
}
export const importCollection = async (args: ImportCollectionArgs) => {
    const { client, filename, fields, tableName, primary_key_strategy, primary_key_name } = args
    console.log(`analyzing fields in ${filename}`)
    // console.log('fields:', JSON.stringify(fields, null, 2));
    console.log(`creating destination table for ${filename}`)
    const tableCreationResult = await createTableForCollection(args)
    console.log(`loading data for ${filename}`)
    const result = await importDataFromJSONFile(args)
    console.log(`done importing ${filename}`)
}

export async function createTableForCollection(args: ImportCollectionArgs) {
    const { client, tableName, fields, primary_key_name, primary_key_strategy } = args
    return new Promise((resolve, reject) => {
        client.query(
            `select column_name, data_type, character_maximum_length, column_default, is_nullable
        from INFORMATION_SCHEMA.COLUMNS where table_schema = 'public' and table_name = '${tableName}'`,
            (err, res) => {
                if (err) {
                    quit()
                    reject(err)
                } else {
                    // console.log(JSON.stringify(res.rows, null, 2));
                    if (res.rows.length > 0) {
                        for (const attr in fields) {
                            // get data_type from rows
                            const dataType = res.rows.find(row => row.column_name === attr)?.data_type
                            if (!dataType) {
                                console.log(`field not found in ${tableName} table: ${attr}`)
                                quit()
                                reject(`field not found in ${tableName} table: ${attr}`)
                            }
                            // check to see if data_type is correct
                            if (
                                attr === primary_key_name
                                    ? getKeyType(primary_key_strategy) !== dataType
                                    : dataType !== fields[attr]
                            ) {
                                console.log(`data type mismatch for field ${attr}: ${dataType}, ${fields[attr]}`)
                                quit()
                                reject(`data type mismatch for field ${attr}: ${dataType}, ${fields[attr]}`)
                            }
                        }
                        console.log(`table ${tableName} already exists, skipping creation`)
                        resolve("table exists")
                    } else {
                        let sql = `create table "${tableName}" (`
                        if (primary_key_strategy !== "none") {
                            sql += `${createPrimaryKey(primary_key_strategy, primary_key_name)},`
                        }
                        for (const attr in fields) {
                            sql += `"${attr}" ${fields[attr]}, `
                        }
                        sql = sql.slice(0, -2)
                        sql += ")"
                        client.query(sql, (err, res) => {
                            if (err) {
                                if (err.toString().endsWith("specified more than once")) {
                                    console.log(err.toString() + ": try specifying a different <primary_key_name>")
                                    quit()
                                } else {
                                    console.log("createTable error:", err)
                                    console.log("sql was: " + sql)
                                }
                                quit()
                                reject(err)
                            } else {
                                // console.log('table created', JSON.stringify(res, null, 2));
                                resolve("table created")
                            }
                        })
                    }
                }
            }
        )
    })
}

export async function parseFieldsFromJSONFile(filename: string): Promise<{ [key: string]: string }> {
    return new Promise((resolve, reject) => {
        const jsonStream = StreamArray.withParser()
        const fields: { [key: string]: string } = {}
        //internal Node readable stream option, pipe to stream-json to convert it for us
        const readStream = fs.createReadStream(filename).pipe(jsonStream.input as any)

        //You'll get json objects here
        //Key is the array-index here
        jsonStream.on("data", ({ key, value }) => {
            for (const attr in value) {
                const v = value[attr]
                const valueType = typeof v

                // cast all numbers to float (double precision) as its the only numeric type in postgres that closely matches a js number
                // without this some client libraries will return strings for numbers which is a major PITA
                if (!fields[attr]) {
                    if (valueType === "number" && Number.isInteger(v)) {
                        fields[attr] = "number"
                    } else {
                        fields[attr] = typeof value[attr]
                    }
                }
                if (fields[attr] && fields[attr] === "integer" && valueType === "number" && !Number.isInteger(v)) {
                    console.log(`Found a float for field ${attr}, casting to type double precision`)
                    fields[attr] = "number"
                }
                if (fields[attr] !== valueType) {
                    if (fields[attr] === "integer" && valueType === "number") {
                        // do nothing, we already casted to double precision if necessary
                    } else {
                        if (fields[attr] !== "object" && value[attr] !== null) {
                            console.log(
                                `multiple field types found for field ${attr}: ${fields[attr]}, ${typeof value[attr]}`
                            )
                            console.log(`casting ${attr} to type object (JSONB)`)
                            fields[attr] = "object"
                            // quit();
                            // reject(`multiple field types found for field ${attr}: ${fields[attr]}, ${typeof value[attr]}`);
                            // process.exit(1);
                        }
                    }
                }
            }
        })

        jsonStream.on("end", () => {
            for (const attr in fields) {
                fields[attr] = jsToSqlType(fields[attr])
            }
            readStream.destroy()
            jsonStream.destroy()
            resolve(fields)
        })
    })
}

export async function importDataFromJSONFile(args: ImportCollectionArgs) {
    const { client, tableName, fields, primary_key_name, primary_key_strategy, filename } = args
    let insertRows: string[] = []
    const jsonStream = StreamArray.withParser()
    let numProcessed = 0
    fs.createReadStream(filename).pipe(jsonStream.input as any)

    return new Promise((resolve, reject) => {
        //internal Node readable stream option, pipe to stream-json to convert it for us

        //You'll get json objects here
        //Key is the array-index here
        jsonStream.on("data", async ({ key, value }) => {
            // console.log(`stream data ${key} id ${value.firestore_id}`)
            let sql = `(`

            for (const attr in fields) {
                let val = value[attr]
                if (typeof val === "object" || fields[attr] === "jsonb") val = JSON.stringify(val)
                if (typeof val === "undefined") {
                    sql += `${sql.length > 1 ? "," : ""}null`
                } else if (
                    fields[attr] !== "double precision" &&
                    fields[attr] !== "bigint" &&
                    fields[attr] !== "float" &&
                    fields[attr] !== "integer" &&
                    fields[attr] !== "numeric" &&
                    fields[attr] !== "boolean"
                ) {
                    sql += `${sql.length > 1 ? "," : ""}'${val.replace(/'/g, "''")}'`
                } else {
                    sql += `${sql.length > 1 ? "," : ""}${value[attr]}`
                }
            }
            if (primary_key_strategy === "firestore_id") {
                // console.log(`processing id ${value.firestore_id}`)
                sql += `,'${value.firestore_id}'`
            }
            sql += ")"
            insertRows.push(sql)
            numProcessed += 1
            if (insertRows.length >= 100) {
                // BATCH_SIZE
                // console.log(`inserting batch of ${100} rows`)
                runSQL(makeInsertStatement(args, [...insertRows]), client)
                // console.log(`inserted batch of ${100} rows`)
                insertRows = []
            }
        })

        jsonStream.on("error", err => {
            console.log("loadData error", err)
        })

        jsonStream.on("end", async () => {
            const result = await runSQL(makeInsertStatement(args, insertRows), client)
            console.log(`inserted ${numProcessed} rows into ${tableName}`)
            resolve("DONE")
        })
    })
}
function makeInsertStatement(args: ImportCollectionArgs, insertRows: string[]) {
    const { client, tableName, fields, primary_key_name, primary_key_strategy } = args
    let fieldList = ""
    for (const attr in fields) {
        fieldList += `${fieldList.length > 0 ? "," : ""}"${attr}"`
    }
    if (primary_key_strategy === "firestore_id") {
        fieldList += `,${primary_key_name}`
    }

    let sql = `insert into "${tableName}" (${fieldList}) values ${insertRows.join(",")} ON CONFLICT DO NOTHING`
    fs.writeFileSync("temp.sql", sql, "utf8")
    return sql
}

async function runSQL(sql: string, client: Client) {
    return new Promise((resolve, reject) => {
        // fs.writeFileSync(`temp.sql`, sql, 'utf-8');
        client.query(sql, (err, res) => {
            if (err) {
                console.log("runSQL error:", err)
                console.log("sql was: " + sql)
                quit()
                reject(err)
            } else {
                resolve(res)
            }
        })
    })
}

function jsToSqlType(type: string) {
    switch (type) {
        case "integer":
            return "float"
        case "string":
            return "text"
        case "number":
            return "float"
        case "boolean":
            return "boolean"
        case "object":
            return "jsonb"
        case "array":
            return "jsonb"
        default:
            return "text"
    }
}
function getKeyType(primary_key_strategy: string) {
    switch (primary_key_strategy) {
        case "none":
            return ""
        case "serial":
            return "integer"
        case "smallserial":
            return "smallint"
        case "bigserial":
            return "bigint"
        case "uuid":
            return "uuid"
        case "firestore_id":
            return "text"
        default:
            return ""
    }
}
function createPrimaryKey(primary_key_strategy: string, primary_key_name: string) {
    switch (primary_key_strategy) {
        case "none":
            return ""
        case "serial":
            return `"${primary_key_name}" SERIAL PRIMARY KEY`
        case "smallserial":
            return `"${primary_key_name}" SMALLSERIAL PRIMARY KEY`
        case "bigserial":
            return `"${primary_key_name}" BIGSERIAL PRIMARY KEY`
        case "uuid":
            return `"${primary_key_name}" UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
        case "firestore_id":
            return `"${primary_key_name}" TEXT PRIMARY KEY`
        default:
            return ""
    }
}
