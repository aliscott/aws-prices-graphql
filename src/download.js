const fs = require('fs');
const axios = require('axios');

const baseUrl = 'https://pricing.us-east-1.amazonaws.com';
const indexUrl = '/offers/v1.0/aws/index.json';

async function main() {
  const indexResp = await axios.get(`${baseUrl}${indexUrl}`);

  for(offer of Object.values(indexResp.data.offers)) {
    
    const regionResp = await axios.get(`${baseUrl}${offer.currentRegionIndexUrl}`);

    for(region of Object.values(regionResp.data.regions)) {
      console.log(`Downloading ${region.currentVersionUrl}`);
      const resp = await axios({
        method: 'get',
        url: `${baseUrl}${region.currentVersionUrl}`,
        responseType: 'stream',
      });
      await resp.data.pipe(fs.createWriteStream(`data/${offer.offerCode}-${region.regionCode}.json`));
    }

  }
}

main();
