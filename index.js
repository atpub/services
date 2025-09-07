import fs from 'fs/promises'
import path from 'path'
import * as yaml from 'js-yaml'
import Ajv from "ajv"

const SRC_DIR = './src'
const OUT_DIR = './dist'

async function build () {

  const ajv = new Ajv()
  const schema = yaml.load(await fs.readFile('./schema/service.yaml'))
  const validate = ajv.compile(schema)

  const out = {}
  for (const id of await fs.readdir(SRC_DIR)) {
    const cdir = path.join(SRC_DIR, id)
    const fn = path.join(cdir, `${id}.yaml`)
    const data = yaml.load(await fs.readFile(fn, 'utf8'))

    // try load icon
    try {
      const icon = await fs.readFile(path.join(cdir, `${id}.svg`))
      data.icon = 'data:image/svg+xml;base64,' + icon.toString('base64')
    } catch {}

    const valid = validate(data)
    if (!valid) {
      console.error(`Invalid item "${id}": ${JSON.stringify(validate.errors, null, 2)}`)
      process.exit(1)
    }


    out[id] = data
  }

  try {
    await fs.rm(OUT_DIR, { recursive: true })
  } catch {}

  await fs.mkdir(OUT_DIR)
  const indexFn = path.join(OUT_DIR, 'index.json')
  await fs.writeFile(indexFn, JSON.stringify(out, null, 2))
  console.log(`Writed: ${indexFn}`)
}

build()