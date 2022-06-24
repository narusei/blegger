'use strict'

import noble from '@abandonware/noble'
import * as mongoDB from 'mongodb'
import * as yargs from 'yargs'

const uri = 'mongodb://root:password@localhost:27017'
const client: mongoDB.MongoClient = new mongoDB.MongoClient(uri)

const main = async () => {
  const argv = await yargs
    .option('name', {
      alias: 'nm',
      description: 'ロギングを行うデバイスのLocalNameを指定してください',
      demandOption: true,
      type: 'string',
    })
    .option('service', {
      alias: 'ser',
      description: 'ロギングを行いたいServiceのUUIDを指定してください',
      demandOption: true,
      type: 'string',
    })
    .option('characteristics', {
      alias: 'char',
      description: 'ロギングを行いたいCharacteristicのUUIDを指定してください',
      demandOption: true,
      type: 'array',
    })
    .option('columns', {
      alias: 'col',
      description: 'データのコレクション名を書いてください',
      demandOption: true,
      type: 'array',
    })
    .help().argv

  const localName = argv.name ? argv.name : ''
  const serviceUUIDs = argv.service ? [argv.service] : []
  const characteristicUUIDs: string[] = argv.characteristics.map((value) => {
    return value.toString()
  })
  const columns: string[] = argv.columns.map((value) => {
    return value.toString()
  })

  if (characteristicUUIDs.length != columns.length) {
    throw new Error('Characteristic and number of columns do not match')
  }

  console.log('Start Data Logging From BLE Deveice')
  console.log('Local Name          : ' + localName)
  console.log('Service UUIDs        : ' + serviceUUIDs)
  console.log('Characteristic UUIDs : ' + characteristicUUIDs)

  const device = await waitDevice(localName)

  console.log('Connecting BLE Device')
  await device.connectAsync()
  console.log('Completed!')

  console.log('Get Service.')
  const service = (await device.discoverServicesAsync(serviceUUIDs))[0]
  console.log('Completed!')

  console.log('Get Characteristics.')
  const characteristics = await service.discoverCharacteristicsAsync(characteristicUUIDs)
  console.log('Completed!')

  console.log('Subscrive BLE Device Data...')

  Promise.all(
    characteristics.map((characteristic) => {
      characteristic.subscribeAsync()
    })
  )

  const colchar = Object.fromEntries(columns.map((col, index) => [col, characteristics[index]]))

  await connectMongo()

  for (const col in colchar) {
    colchar[col].on('data', async (data) => {
      const receivedData = data.toString()
      console.log(receivedData)
      const postData = { ...receivedData.split(',') }
      await postMongo(col, postData)
    })
  }

  process.on('SIGINT', async () => {
    await client.close()
    console.log('Mongo Client Close')
    device.disconnect()
    console.log('BLE Device Disconnected')
    process.exit(0)
  })
}

main()

// MongoDB
const connectMongo = async () => {
  try {
    await client.connect()
    await client.db('admin').command({ ping: 1 })
    console.log('Connected successfully to server')
  } catch (error) {
    console.log(error)
  }
}

const postMongo = async (colName: string, data: mongoDB.Document) => {
  try {
    const dbSensing = await client.db('sensing')
    const colSensing = dbSensing.collection(colName)
    const result = await colSensing.insertOne(data)
    return result
  } catch (error) {
    console.log(error)
  }
}

// BLE
const waitDevice = async (localName: string) => {
  console.log('Start Scan & Get Target Device')
  noble.on('stateChange', async (state) => {
    if (state === 'poweredOn') {
      await noble.startScanningAsync()
    } else {
      await noble.stopScanningAsync()
    }
  })

  const discoveryHandler = new Promise<noble.Peripheral | undefined>((resolve, _reject) => {
    console.log('Start Scanning...')
    noble.on('discover', async (peripheral: noble.Peripheral) => {
      console.log(`${peripheral.advertisement.localName}`)
      if (peripheral.advertisement.localName == localName) {
        console.log('Find ' + peripheral.advertisement.localName + '!')
        resolve(peripheral)
      }
    })
  })

  const timeoutHandler = new Promise<noble.Peripheral | undefined>((resolve, _reject) => {
    setTimeout(() => {
      resolve(undefined)
    }, 30000)
  })

  try {
    const device = await Promise.race([discoveryHandler, timeoutHandler])

    noble.removeAllListeners()

    if (device) {
      return device
    } else {
      throw new Error('Device not Found')
    }
  } catch (e) {
    throw new Error('Timeout')
  }
}
