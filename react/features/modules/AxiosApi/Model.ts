import axios from "axios";
import { ApiEndPoint } from "./constants";
import { Config } from "../../../ThirdPartyConfig";

axios.defaults.baseURL = Config.BACKEND_URL;
axios.defaults.headers.common["x-api-key"] = Config.API_KEY;

function AxiosApiHitter(API_NAME, data) {
    return axios
        .post(ApiEndPoint[API_NAME], data)
}

export { AxiosApiHitter };
