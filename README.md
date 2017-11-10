# spdz-client-lib

## Features

This library is intended for use by end user applications that wish to interact with the SPDZ MPC software. It provides a client interface to the SPDZ Proxy API and some helper functions to manage encrypted traffic. More specifically it has:

- an interface to the SPDZ Proxy web socket API which also manages access to multiple SPDZ parties and provides a reactive interface where the SPDZ Proxy pushes data as soon as it becomes available,
- an interface to the SPDZ Proxy REST API, including aggregating access to multiple SPDZ parties,
- provides an interface to the SPDZ Proxy bootstrap API to start a SPDZ process, here a client can only manage one SPDZ Proxy,
- provides type mapping between the SPDZ binary format of big integers in a finite field mod P montgomery representation, to a big integer and fixed point integers,
- provides functions for key management and encryption to allow Diffie-Hellman authenticated encryption.

## Usage

See the [generated apidoc](./api.md) created with `npm run apidoc`.

The web socket interface is the recommended way to interact with the SPDZ Proxies, it is both more fully featured and responsive. Note that it relies on the SPDZ MPC program sending the data type header with the write_to_socket instruction, for example `regint.write_to_socket(socket_id, results, ClientMessageType.Int32)`.

The REST interface is easier to reason about and does not rely on knowledge of reactive programming. It supports fewer SPDZ data types and does not support SPDZ sending the data type header with the write_to_socket instruction, for example `regint.write_to_socket(socket_id, results)`. This means the client program needs prior knowledge of the order and types of SPDZ messsages being sent.

See the [demonstrator program](./demo/README.md) for an end to end example of using the spdz-client-lib to connect to SPDZ engines. 

## Build 

Run tests with `npm test`.

Build/transpile code to ES5 before uploading to GIT with `npm run build`

Include in other node projects with:

 `npm install --save git+ssh://git@github.com/<location>/spdz-client-lib.git#v0.1.0`

Dependencies between the library and spdz-proxy are:

| spdz-client-lib | spdz-proxy |
| --------------- | ---------- |
| v0.1.0          | v0.1.0     |

## Compatibility

-   node.js, tested against v8.6
-   tested in latest versions of Chrome, Safari, Firefox.
