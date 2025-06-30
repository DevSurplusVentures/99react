set -ex

dfx identity new alice --storage-mode=plaintext || true

dfx identity use alice

ALICE_PRINCIPAL=$(dfx identity get-principal)

dfx identity new bob --storage-mode=plaintext || true

dfx identity use bob

BOB_PRINCIPAL=$(dfx identity get-principal)

dfx identity new icrc7_deployer --storage-mode=plaintext || true

dfx identity use icrc7_deployer

ADMIN_PRINCIPAL=$(dfx identity get-principal)

dfx deploy market   --mode reinstall

MARKET_ID=$(dfx canister id market)
echo $MARKET_ID

dfx deploy token --mode reinstall

TOKEN_ID=$(dfx canister id token)
echo $TOKEN_ID

#mint tokens to admin on sub account 1
dfx canister call token icrc1_transfer "(
  record {
    to = record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = opt blob \"\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\"; };
    amount = 1_000_0000_0000 : nat;
    fee = null;
    from_subaccount = null;
    memo = opt blob \"\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\";
    created_at_time = null;
  }
)"

#mint tokens to alice


#Deploy the canister
for CANISTER in nft1 nft2 nft3; do
  dfx deploy $CANISTER --argument 'record {icrc7_args = null; icrc37_args =null; icrc3_args =null;}' --mode reinstall

  CANISTER_ID=$(dfx canister id $CANISTER)
  echo $CANISTER_ID

  # init the canister
  dfx canister call $CANISTER init

  # Get Name
  dfx canister call $CANISTER icrc7_name --query

  # Get Symbol
  dfx canister call $CANISTER icrc7_symbol --query

  # Get Description
  dfx canister call $CANISTER icrc7_description --query

  # Get Logo
  dfx canister call $CANISTER icrc7_logo --query

  # Mint 4 NFTs
  dfx canister call $CANISTER icrcX_mint "(
    vec {
      record {
        token_id = 0 : nat;
        owner = opt record { owner = principal \"$CANISTER_ID\"; subaccount = null;};
        metadata = variant {
          Map = vec {
            record { \"icrc97:metadata\"; variant { Array = vec {
              variant { Text = \"http://localhost:5173/metadata/0.json\" }
            }}}
          }
        };
        memo = opt blob \"\00\01\";
        override = true;
        created_at_time = null;
      };
      record {
        token_id = 1 : nat;
        owner = opt record { owner = principal \"$CANISTER_ID\"; subaccount = null;};
        metadata = variant {
          Map = vec {
            record { \"icrc97:metadata\"; variant { Array = vec {
              variant { Text = \"http://localhost:5173/metadata/1.json\" }
            }}}
          }
        };
        memo = opt blob \"\00\01\";
        override = true;
        created_at_time = null;
      };
      record {
        token_id = 2 : nat;
        owner = opt record { owner = principal \"$CANISTER_ID\"; subaccount = null;};
        metadata = variant {
          Map = vec {
            record { \"icrc97:metadata\"; variant { Array = vec {
              variant { Text = \"http://localhost:5173/metadata/2.json\" }
            }}}
          }
        };
        memo = opt blob \"\00\01\";
        override = true;
        created_at_time = null;
      };
      record {
        token_id = 3 : nat;
        owner = opt record { owner = principal \"$CANISTER_ID\"; subaccount = null;};
        metadata = variant {
          Map = vec {
            record { \"icrc97:metadata\"; variant { Array = vec {
              variant { Text = \"http://localhost:5173/metadata/3.json\" }
            }}}
          }
        };
        memo = opt blob \"\00\01\";
        override = true;
        created_at_time = null;
      };
    }
  )"

  # Internally use transfer to transfer to admin
  dfx canister call $CANISTER assign "(0, record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = opt blob \"\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\";})";

  # Internally use transfer to transfer to admin
  dfx canister call $CANISTER assign "(1, record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = opt blob \"\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\";})";

  # Internally use transfer to transfer to admin
  dfx canister call $CANISTER assign "(2, record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = opt blob \"\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\";})";

  # Internally use transfer to transfer to admin
  dfx canister call $CANISTER assign "(3, record { owner = principal \"$ADMIN_PRINCIPAL\"; subaccount = opt blob \"\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\";})";

  #approve token 1 for the market
  dfx canister call $CANISTER icrc37_approve_tokens "(
    vec {
      record {
        token_id = 1 : nat;
        approval_info = record {
          from_subaccount = opt blob \"\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\";
          spender = record {
            owner = principal \"$MARKET_ID\";
            subaccount = null;
          };
          memo = null;
          expires_at = null;
          created_at_time = null;
        };
      }
    })"

  #list token 1 in the market

  dfx canister call market icrc8_manage_market "vec {
    opt variant { 
      list_intent = vec { 
        opt variant{
          intent_tokens = vec {
            record {
              kind = variant { intent = vec {
                opt record {
                  canister = principal \"$CANISTER_ID\";
                  inventory = opt variant{ 
                    tokenIds = vec { 1 : nat; }
                  };
                  token_pointer = null;
                  meta = null;
                };
              }};
              counterparty = null;
              owner = record {
                owner = principal \"$ADMIN_PRINCIPAL\";
                subaccount = opt blob \"\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\";
              };
              target_intent_id = null;
              lock_to_date = null;
            }
          }
        };
        opt variant{
          satisfying_tokens = vec{
            vec {
              record {
                canister = principal \"$TOKEN_ID\";
                inventory = opt variant{ 
                  quantity = 1_0000_0000 : nat
                };
                token_pointer = null;
                meta = null;
              };
            };
          }
        };
      }
    }
  }"
  
  
done
