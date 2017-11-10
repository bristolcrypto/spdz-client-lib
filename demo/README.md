# Demonstrator
Demonstrate external clients connecting to SPDZ via the SPDZ Proxies to run the millionaires problem. These use the spdz-client-lib web socket interface.

## Steps

SPDZ MPC program:
 - checkout and build the spdz-2 engine code,
 - compile the `./Programs/Source/millionaires.mpc` program. See [SPDZ Readme](https://github.com/bristolcrypto/SPDZ-2/) for compiling and running programs from external directories,
 - run the `Scripts/setup-online.sh` script to generate the pre-processing material,
 - start 2 SPDZ engines locally with `Scripts/run-online.sh millionaires`, these will listen on ports 14000 and 14001 for spdz proxy connections

SPDZ Proxies:
 - checkout and install the spdz-proxy nodejs service
 - start 2 proxies with `<spdz-proxy location>/Scripts/dev-start-proxies.sh`, these will listen on ports 3010 and 3010 for client connections

Client program:
 - run up to 8 client programs in separate processes with ` node millionaires_client.js <unique client id> <client worth> <all clients joined>`. The last client to join the computation sets 'all clients joined' to 1.

 - For example:
```
 node millionaires_client.js 123 1000 0
 node millionaires_client.js 456 2000 0
 node millionaires_client.js 789 1500 1

 => expected result is winner id of 456
```