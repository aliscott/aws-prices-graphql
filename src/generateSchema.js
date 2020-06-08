require('dotenv').config();
const _ = require('lodash');
const { MongoClient } = require('mongodb');

async function main() {
  const mongoClient = await MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true });
  const db = mongoClient.db();

  const mr = await db.collection('products').mapReduce(
    function() {
      emit(this.servicecode, { keys: Object.keys(this) });
    },
    function (key, values) {
      const keySet = new Set();
      for (value of values) {
        for (k of value.keys) {
          keySet.add(k);
        }
      }
      return { keys: Array.from(keySet) };
    }, 
    { out: { merge: 'product_fields' } }
  );

  console.log(await db.collection('product_fields').distinct('_id'));


  mongoClient.close();
}

main();