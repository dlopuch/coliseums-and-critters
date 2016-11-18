# coliseums-and-critters

A brutish API where critters are conjured into existance and forced to battle each other in a coliseum service.
   
Tech Stack:
- NodeJS for the micro services
- ExpressJS for RESTful HTTP endpoints
- MochaJS for running tests
- [RabbitMQ](https://www.rabbitmq.com) as a message queue server 
- SQLite for persistant storage

## Requirements
- Node and NPM
- MochaJS globally installed, ie `npm install -g mocha`
- [RabbitMQ](https://www.rabbitmq.com)
  - on OS-X, install with homebrew: `brew install rabbitmq`
  - once installed, start with `rabbitmq-server`
  - verify it is running with `rabbitmqctl -n rabbit@localhost status`
  - This project assumes it is running locally on default ports
  
# Architecture

Two services are implemented in this project:
- `/managementService`: Exposes the RESTful API to manage our critters
  - Uses a SQLite database to persist critter records
- `/coliseumService`: Performs the battle calculations.  These are CPU-intensive

## RESTful endpoints:
Several endpoints are implemented:
- `POST /api/critter`: create a new critter
- `GET /api/critter/:id`: gets a critter model
- `POST /api/battle`: creates a new battle with two critters
  - Required body params:
  - `critterAId: {string}` ID of challenger critter
  - `critterBId: {string}` ID of challenged critter
- `GET /api/battle/:id`: gets battle information
  - If the battle is still being processed, some result info may be null


## Inter-Service Communication

The services communicate through queues running on a RabbitMQ message queue server.
RabbitMQ adds resiliency against service failure and provides a scaling mechanism:
- Many coliseumService workers can be instantiated.  All will connect to the RabbitMQ
  server, and RabbitMQ has various tunable parameters around message scheduling (we use 
  default round-robin)
- Messages need to be acknowledged when work on them is complete.  If a worker fails or times out,
  the message will automatically be requeued and sent to another worker.
- As a well-recognized message queue solution, various solutions exist for performance monitoring,
  clustering of the queue server, etc.
  
Two message queues are implemented for inter-service communication:
- `'openBattles'`: 
  - Messages indicate a new battle has been initiated and needs to be calculated
  - Messages are published by the `managementService` and consumed by the `coliseumService`
- `'closedBattles'`:
  - Messages indicate a battle has been performed and calculations are ready for persistence
  - Messages are published by the `coliseumService` and consumed by the `managementService`
  
# Tests
## Pre-req: Initialize common-lib
**TESTS PREREQ:** Before running any tests, initialize common-lib:
- `cd common-lib`
- `npm install`
  
## managementService
The managementService implements API integration tests that test the API, database, and queue processing.
 The tests hit the managementService endpoints and using mock publishers and consumers on the message queues,
 ensure that the appropriate messages appear and the appropriate data has been persisted.
 
To run:
- Install mocha globally: `npm install -g mocha`
- `cd managementService`
- `npm install`
- `npm run init-db`
- `npm run test`

## Integration Tests
This project has top-level integration tests that check all the services can start up and communicate properly.
This is similar to the managementService's API tests in method, but there's no mocking of the coliseumService -- 
the integration test script spins up both the managementService and the coliseumService and checks that the two
processes are properly communicating with each other.

To run:
- Install mocha globally: `npm install -g mocha`
- Make sure managmentService has been initialized:
  - `cd managementService; npm install; npm run init-db`
- Make sure coliseumService has been initialized:
  - `cd coliseumService; npm install`
- Make sure RabbitMQ server is running:
  - `rabbitmq-server`
- Run integration tests:
  - In project root:
  - `npm install`
  - `npm run integration-test`
  
# Running Processes Manually
- PRE-REQ: common
  - `cd common-lib`
  - `npm install`
- managementService:
  - `cd managementService;`
  - One-time init: `npm install; npm run init-db;`
  - `npm run start`
- coliseumService:
  - `cd coliseumService`
  - One-time init: `npm install`
  - `npm run start`
  
Then, to create a critter:

`curl -X POST localhost:3000/api/critter`

And to create a battle:

`curl -H "Content-Type: application/json" -X POST -d '{"critterAId": "crit-22322a57-96f4-4e51-8e18-4e0fba4f0234", "critterBId": "crit-9d4fda11-bc09-4da2-84b2-03d0761571a9"}' localhost:3000/api/battle`
  
# Maintanence 
- RabbitMQ queues
  - To clear all queues (blow them away):
    - `rabbitmqctl -n rabbit@localhost stop_app`
    - `rabbitmqctl -n rabbit@localhost reset`
    - `rabbitmqctl -n rabbit@localhost start_app`
  - To view queues: `rabbitmqadmin list queues`
  - To view items on a queue: `rabbitmqadmin get queue=closed_battles requeue=true count=100`
    - (Viewing seems to be... complicated.  Try killing node app if saying no items available)
    
