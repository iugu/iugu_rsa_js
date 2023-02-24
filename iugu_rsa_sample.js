// para executar:
// - Altere a linha iuru_rsa.api_token, informando seu token
// - Execute o arquivo com o comando abaixo:
// node ./iugu_rsa_sample.js
// - Observação: No linux se ocorrero o erro: "UnhandledPromiseRejectionWarning: Error: error:25066067:DSO support routines:dlfcn_load:could not load the shared library"
// Execute o comando abaixo antes de executar o código
// export OPENSSL_CONF=/dev/null

// #####################################################################################################
// #####################################################################################################
// #####################################################################################################

var https = require("https");
const crypto = require("crypto");
const fs = require("fs");

// #####################################################################################################
//                                           IUGU_RSA_SAMPLE
/*module.exports = */
class IUGU_RSA_SAMPLE {
  print_vars = false;
  api_token = "TOKEN CREATED ON IUGU PANEL"; // Link de referência: https://dev.iugu.com/reference/autentica%C3%A7%C3%A3o#criando-chave-api-com-assinatura
  file_private_key = "/file_path/private_key.pem"; // Link de referência: https://dev.iugu.com/reference/autentica%C3%A7%C3%A3o#segundo-passo

  get_request_time() {
    // Link de referência: https://dev.iugu.com/reference/autentica%C3%A7%C3%A3o#quinto-passo
    var date = new Date();
    var tzo = -date.getTimezoneOffset(),
      dif = tzo >= 0 ? "+" : "-",
      pad = function (num) {
        return (num < 10 ? "0" : "") + num;
      };

    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes()) +
      ":" +
      pad(date.getSeconds()) +
      dif +
      pad(Math.floor(Math.abs(tzo) / 60)) +
      ":" +
      pad(Math.abs(tzo) % 60)
    );
  }

  get_private_key() {
    const text_key = fs.readFileSync(this.file_private_key, "utf8");
    return text_key;
  }

  sign_body(method, endpoint, request_time, body, private_key) {
    // Link de referência: https://dev.iugu.com/reference/autentica%C3%A7%C3%A3o#sexto-passo
    let ret_sign = "";
    const pattern =
      method +
      "|" +
      endpoint +
      "\n" +
      this.api_token +
      "|" +
      request_time +
      "\n" +
      body;
    const privateSignature = crypto.createSign("SHA256");
    privateSignature.update(Buffer.from(pattern, "utf8"));
    ret_sign = privateSignature.sign({ key: private_key }).toString("base64");
    return ret_sign;
  }

  last_response = "";

  getLastResponse() {
    return this.last_response;
  }

  last_response_code = 0;
  getLastResponseCode() {
    return this.last_response_code;
  }

  async send_data(method, endpoint, data, response_code_ok) {
    // Link de referência: https://dev.iugu.com/reference/autentica%C3%A7%C3%A3o#d%C3%A9cimo-primeiro-passo
    this.last_response = "";
    this.last_response_code = 0;
    const request_time = this.get_request_time();
    const body = JSON.stringify(data);
    const signature = this.sign_body(
      method,
      endpoint,
      request_time,
      body,
      this.get_private_key()
    );

    if (this.print_vars) {
      console.log("endpoint: " + method + " - " + endpoint);
      console.log("request_time: " + request_time);
      console.log("api_token: " + this.api_token);
      console.log("body: " + body);
      console.log("signature: " + signature);
    }

    let ret = false;
    var req_options = {
      host: "api.iugu.com",
      port: "443",
      path: endpoint,
      method: method.toUpperCase(),
      headers: {
        "Content-type": "application/json",
        Accept: "application/json",
        "Request-Time": request_time,
        Signature: "signature=" + signature,
      },
    };
    let responseBody = "";

    const doRequest = () => {
      return new Promise((resolve) => {
        const req = https.request(req_options, function (res) {
          res.setEncoding("utf8");
          res.on("data", function (chunk) {
            responseBody += chunk;
          });
          res.on("end", function () {
            resolve(res.statusCode);
          });
        });
        req.write(body);
        req.end();
      });
    };

    this.last_response_code = await doRequest();
    this.last_response = responseBody;
    ret = this.last_response_code == response_code_ok;
    return ret;
  }

  async signature_validate(data) {
    // Link de referência: https://dev.iugu.com/reference/validate-signature
    const method = "POST";
    const endpoint = "/v1/signature/validate";
    return await this.send_data(method, endpoint, data, 200);
  }

  async transfer_requests(data) {
    const method = "POST";
    const endpoint = "/v1/transfer_requests";
    return await this.send_data(method, endpoint, data, 202);
  }
}
// #####################################################################################################

(async () => {
  // #####################################################################################################
  //                                    Example of use IUGU_RSA_SAMPLE
  // #####################################################################################################
  const iuru_rsa = new IUGU_RSA_SAMPLE();
  iuru_rsa.api_token = "";
  iuru_rsa.print_vars = true;
  iuru_rsa.file_private_key = "./private.pem";

  // #####################################################################################################
  //                                          signature_validate
  // Link de referência: https://dev.iugu.com/reference/validate-signature
  const json = {
    api_token: iuru_rsa.api_token,
    mensagem: "qualquer coisa",
  };

  if (await iuru_rsa.signature_validate(json)) {
    console.log("Response: " + iuru_rsa.getLastResponseCode() + iuru_rsa.getLastResponse());
  } else {
    console.log("Error: " + iuru_rsa.getLastResponseCode() + iuru_rsa.getLastResponse());
  }
  // #####################################################################################################

  // #####################################################################################################
  //                                           transfer_requests
  const json2 = {
    api_token: iuru_rsa.api_token,
    transfer_type: "pix",
    amount_cents: 1,
    receiver: {
      pix: {
        key: "000000000",
        type: "cpf",
      },
    },
  };

  if (await iuru_rsa.transfer_requests(json)) {
    console.log("Response: " + iuru_rsa.getLastResponseCode() + iuru_rsa.getLastResponse());
  } else {
    console.log("Error: " + iuru_rsa.getLastResponseCode() + iuru_rsa.getLastResponse());
  }
  // #####################################################################################################
})();
