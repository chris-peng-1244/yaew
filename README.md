# yaew
Yet Another Ethereum Wallet

## Requirement
- Nodejs 8.11.0
- Redis
- yarn
- pm2

## How to install

### 1. Install the npm dependencies
```
$ yarn
```

### 2. Create .env  from .env.example
```
$ cp .env.example .env
```

### 3. Fill the env values as needed
* APP_NAME This variable is used to give your app a namespace in redis
* JWT_SECRET Used to encrypt jwt token
* API_USERNAME How others login into this system
* API_PASSWORD The password of the user above, this password is hashed, use bin/generate_password.js to create one.
* ETH_PROVIDER The Eth http provider you prefer, I've tested INFURA and testrpc
* ETH_COINBASE The "main" account you use to sweep/send eths and tokens
* MAX_GAS_PRICE In gwei
* SWEEP_GAS_PRICE How much do you want to pay for the gas when sweeping
* MIN_SWEEP_ETH_AMOUNT What is the minimum amout of eth you decide to begin sweep

### 4. Tell the system what your main account address is
```
$ node bin/set_coinbase.js address privatekey
```

### 5. Tell the system what token you want to support
```
$ node bin/add_token.js token_address token_decimal
```

### 6. Start the app with pm2
Install pm2 if you haven't got it already.
```
$ pm2 start ecosystem.json
```
Or start it manually:
```
$ node bin/www
$ node bin/watch_blockchain.js
```

## Cavaet
Managing the nonce of eth address is annoying, you either do it
sequentially, or count it by yourself. A sequential approach is way too
slow, so I choose the self-management one. As a consequence, DO NOT send
any transaction with your main account outside the system otherwise I
can't track the nonce for you, and almost every transaction will fail.
