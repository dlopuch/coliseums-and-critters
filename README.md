# coliseums-and-critters

## Requirements
- Node and NPM
- [RabbitMQ](https://www.rabbitmq.com)
  - on OS-X, install with homebrew: `brew install rabbitmq`
  - once installed, start with `rabbitmq-server`
  - verify it is running with `rabbitmqctl -n rabbit@localhost status`
  
## Maintanence 
- RabbitMQ queues
  - To clear all queues (blow them away):
    - `rabbitmqctl -n rabbit@localhost stop_app`
    - `rabbitmqctl -n rabbit@localhost reset`
    - `rabbitmqctl -n rabbit@localhost start_app`
  - To view queues: `rabbitmqadmin list queues`
  - To view items on a queue: `rabbitmqadmin get queue=closed_battles requeue=true count=100`
    - (Viewing seems to be... complicated.  Try killing node app if saying no items available)
    
