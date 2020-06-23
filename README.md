# aws-prices-graphql: AWS Price List GraphQL API

AWS offers a [Bulk API](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-ppslong.html), which returns large JSON files containing all price points for each service or a [Query API](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-pelong.html), which requires AWS credentials and an IAM user.

This project creates a GraphQL API using the data from the AWS Price List Bulk API.

This project currently uses a generic GraphQL schema to represent all AWS products. Future work might move to using schemas for each distinct AWS product.

## Table of Contents

* [Example requests](#example-requests)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Usage](#usage)
  * [Running](#running)
* [Future work](#future-work)
* [Contributing](#contributing)
* [License](#license)

## Example requests

Get all t3.micro prices in US East, this returns 30+ results. Try it yourself by pasting the query into [https://aws-prices-graphql.alistair.scot/graphql](https://aws-prices-graphql.alistair.scot/graphql). This is running on minimal infrastructure so is not guaranteed to always be available.

```graphql
query {
  products(
    filter: {
      attributes: [
        { key: "servicecode", value: "AmazonEC2" },
        { key: "instanceType", value: "t3.micro" },
        { key: "location", value: "US East (N. Virginia)" }
      ]
    },
  ) {
    attributes { key, value }
    onDemandPricing {
      priceDimensions {
        pricePerUnit {
          USD
        }
      }
    }
  }
}
```

Get the hourly on-demand price of a Linux EC2 t3.micro instance in US East:

Request:

```graphql
query {
  products(
    filter: {
      attributes: [
        { key: "servicecode", value: "AmazonEC2" },
        { key: "instanceType", value: "t3.micro" },
        { key: "location", value: "US East (N. Virginia)" }
        { key: "tenancy", value: "Shared" }
        { key: "operatingSystem", value: "Linux"}
        { key: "capacitystatus", value: "Used" }
        { key: "preInstalledSw", value: "NA"}
      ]
    },
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

Response:

```json
{
  "data": {
    "products": [
      {
        "onDemandPricing": [
          {
            "priceDimensions": [
              {
                "pricePerUnit": {
                  "USD": "0.0104000000"
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Getting started

### Prerequisites

 * Node.js >= 12.18.0
 * MongoDB >= 3.6

### Installation

1. Clone the repo

  ```sh
  git clone https://gitlab.com/aliscott/aws-prices-graphql.git
  cd aws-prices-graphql
  ```

2. Add a `.env` file to point to your MongoDB server, e.g.

  ```
  MONGODB_URI=mongodb://localhost:27017/awsPricing
  ```

3. Install the npm packages

  ```sh
  npm install
  ```

4. Download the AWS pricing files into the `data` directory.
   **Note: this downloads about 1.8 GB of data**

  ```sh
  npm run downloadPrices
  ```

5. Load the prices into MongoDB

  ```sh
  npm run loadPrices
  ```

## Usage

### Running

```
npm start
```

You can now access the GraphQL Playground at [http://localhost:4000/graphql](http://localhost:4000/graphql).

## Future work

 * Product-specific schemas - can we auto-generate these?

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[ISC](https://choosealicense.com/licenses/isc/)
