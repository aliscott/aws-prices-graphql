const _ = require('lodash');
const fs = require('fs');
const { ApolloClient } = require('apollo-boost');
const fetch = require('cross-fetch/polyfill').fetch;
const createHttpLink = require('apollo-link-http').createHttpLink;
const InMemoryCache = require('apollo-cache-inmemory').InMemoryCache;
const gql = require('graphql-tag');

const planPath = 'tmp/terraform_example/output.json';

const noChargeServices = [
  'aws_internet_gateway',
  'aws_key_pair',
  'aws_route',
  'aws_security_group',
  'aws_subnet',
  'aws_vpc',
];

const regionMappings = {
	'us-gov-west-1':  'AWS GovCloud (US)',
	'us-gov-east-1':  'AWS GovCloud (US-East)',
	'us-east-1':      'US East (N. Virginia)',
	'us-east-2':      'US East (Ohio)',
	'us-west-1':      'US West (N. California)',
	'us-west-2':      'US West (Oregon)',
	'ca-central-1':   'Canada (Central)',
	'cn-north-1':     'China (Beijing)',
	'cn-northwest-1': 'China (Ningxia)',
	'eu-central-1':   'EU (Frankfurt)',
	'eu-west-1':      'EU (Ireland)',
	'eu-west-2':      'EU (London)',
	'eu-west-3':      'EU (Paris)',
	'eu-north-1':     'EU (Stockholm)',
	'ap-east-1':      'Asia Pacific (Hong Kong)',
	'ap-northeast-1': 'Asia Pacific (Tokyo)',
	'ap-northeast-2': 'Asia Pacific (Seoul)',
	'ap-northeast-3': 'Asia Pacific (Osaka-Local)',
	'ap-southeast-1': 'Asia Pacific (Singapore)',
	'ap-southeast-2': 'Asia Pacific (Sydney)',
	'ap-south-1':     'Asia Pacific (Mumbai)',
	'me-south-1':     'Middle East (Bahrain)',
	'sa-east-1':      'South America (Sao Paulo)',
	'af-south-1':     'Africa (Cape Town)',
}

const valueMappings = {
  aws_instance: {
    instance_type: 'instanceType',
    tenancy: 'tenancy',
  },
  aws_rds_instance: {
    instance_class: 'instanceType',
    engine: 'databaseEngine',
    // TODO: multi-az 
  },
}

const defaultFilters = {
  aws_instance: [
    { key: 'servicecode', value: 'AmazonEC2' },
    { key: 'productFamily', value: 'Compute Instance' },
    { key: 'operatingSystem', value: 'Linux' },
    { key: 'preInstalledSw', value: 'NA' },
    { key: 'capacitystatus', value: 'Used' },
  ],
  aws_elb: [
    { key: 'servicecode', value: 'AWSELB' },
    { key: 'productFamily', value: 'Load Balancer' },
    { key: 'usagetype', value: 'LoadBalancerUsage' },
  ],
  aws_rds_instance: [
    { key: 'servicecode', value: 'AmazonRDS' },
    { key: 'productFamily', value: 'Database Instance' },
    { key: 'deploymentOption', value: 'Single-AZ' },
  ]
};

const apolloClient = new ApolloClient({
  link: createHttpLink({
    uri: 'http://localhost:4000/graphql',
    fetch: fetch
  }),
  cache: new InMemoryCache(),
});

async function main() {
  const terraformPlan = JSON.parse(fs.readFileSync(planPath));
  const resources = terraformPlan.planned_values.root_module.resources;

  const region = regionMappings[terraformPlan.variables.aws_region.value];
  const regionFilters = [
    { key: 'locationType', value: 'AWS Region' },
    { key: 'location', value: region },
  ];

  let totalHourlyPrice = 0.0;

  for (resource of resources) {
    if (noChargeServices.includes(resource.type)) {
      console.log(`Skipping ${resource.address}: no charges for ${resource.type}`);
      continue;
    }

    if (!_.has(defaultFilters, resource.type)) {
      console.log(`Skipping ${resource.address}: unsupported resource type ${resource.type}`);
      continue;
    }

    const valueFilters = [];
    Object.entries(resource.values).forEach(valuePair => {
      const [ key, value ] = valuePair;
      if (_.has(valueMappings[resource.type], key)) {
        valueFilters.push({
          key: valueMappings[resource.type][key],
          value,
        });
      }
    });

    const attributeFilters = [
      ...defaultFilters[resource.type] || [],
      ...regionFilters,
      ...valueFilters,
    ];

    const resp = await apolloClient.query({
      query: gql`
        query($filter: ProductFilter!) {
          products(
            filter: $filter,
          ) {
            onDemandPricing {
              priceDimensions {
                pricePerUnit {
                  USD
                }
              }
            }
          }
        }
      `,
      variables: {
        filter: { 
          attributeFilters,
        },
      },
    });

    const hourlyPrice = parseFloat(resp.data.products[0].onDemandPricing[0].priceDimensions[0].pricePerUnit.USD);
    totalHourlyPrice += hourlyPrice;
    console.log(`Hourly price for ${resource.address}: ${hourlyPrice}`);
  }

  console.log(`Total hourly price ${totalHourlyPrice}`);
}

main();