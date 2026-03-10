# money-free


curl --location --request POST 'http://compass.llm.shopee.io/compass-api/v1/messages' \
--header 'Authorization: Bearer 01c9129c2780c0841b170fb6207f37478dcc0d88f011467c9c686fcf65772ed1' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [
        {"role": "user", "content": "Hello, world"}
    ]
}'