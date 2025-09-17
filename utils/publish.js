import 'dotenv/config'
import { AtpAgent } from '@atproto/api'
import * as fs from 'fs/promises'
import * as jsondiffpatch from 'jsondiffpatch'

const SERVICE_COLLECTION = "me.atpub.identity.service"

const agent = new AtpAgent({
  service: 'https://' + process.env.ATPUB_SERVICE_PDS
})

const session = await agent.login({
  identifier: process.env.ATPUB_SERVICE_IDENTIFIER,
  password: process.env.ATPUB_SERVICE_PASSWORD,
})

const { did, handle } = session.data
console.log(`handle=${handle} did=${did}`)

// functions

function now() {
  return new Date().toISOString()
}

async function createRecord(rkey, record) {
  return agent.com.atproto.repo.createRecord({
    repo: did,
    collection: SERVICE_COLLECTION,
    rkey,
    record: Object.assign({
      $type: SERVICE_COLLECTION,
      createdAt: now(),
    }, record),
  })
}

async function updateRecord(rkey, record) {
  return agent.com.atproto.repo.putRecord({
    repo: did,
    collection: SERVICE_COLLECTION,
    rkey,
    record: Object.assign(record, { updatedAt: now() })
  })
}

async function deleteRecord(rkey) {
  return agent.com.atproto.repo.deleteRecord({
    repo: did,
    collection: SERVICE_COLLECTION,
    rkey
  })
}

function normalize(obj) {
  const exclude = ['createdAt', 'updatedAt']
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !exclude.includes(key))
  )
}

// -----------------------
// logic starts here

const res = await agent.com.atproto.repo.listRecords({
  repo: did,
  collection: SERVICE_COLLECTION,
})

const currentRecords = res.data.records

const data = JSON.parse(await fs.readFile("./dist/index.json"))
for (const [sid, s] of Object.entries(data.services)) {
  const curr = currentRecords.find(r => r.uri.endsWith([SERVICE_COLLECTION, sid].join('/')))?.value
  if (curr) {
    // check if record is different
    const delta = jsondiffpatch.diff(normalize(curr), normalize(s))
    if (!delta) {
      console.log(`${sid} → no change`)
      continue
    }
    await updateRecord(sid, Object.assign(s, { createdAt: s.createdAt }))
    console.log(`${sid} → updated`)
  } else {
    await createRecord(sid, s)
    console.log(`${sid} → created`)
  }
}

console.log('publish done')