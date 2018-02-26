/**
 * Function to post data to the API
 *
 * @param method
 * @param data
 * @param callback
 * @param auth
 */
export default (method, data, callback, auth = "") => {
    const xmlhttp = new XMLHttpRequest();
    let route = "/api";

    xmlhttp.open("POST", route);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.setRequestHeader("Bearer", auth);
    xmlhttp.send(JSON.stringify(data));

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === XMLHttpRequest.DONE) {
            const responseCode = xmlhttp.status;
            const response = JSON.parse(xmlhttp.responseText);
            console.log('response', response);

            console.log('responseCode', responseCode);

            if (responseCode === 200) {
                callback({error: false});
            } else {
                callback({error: true, fields: response.fields, raw_error: response.error});
            }
        }
    }
}
