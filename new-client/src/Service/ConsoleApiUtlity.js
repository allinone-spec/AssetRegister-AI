import axios from "axios";
// import { logout } from "../Redux/slice/authSlice";
import { adminConsoleBaseUrl } from '../Utility/baseUrl';
// import store from "../Redux/store/store";
 
const conApi = axios.create({
    baseURL: adminConsoleBaseUrl,
});


conApi.interceptors.request.use( 
    (config) => {
     //   const token  ='Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbkBnbWFpbC5jb20iLCJpYXQiOjE3NDQ4NjcyNzUsImV4cCI6MTc0NDk1MzY3NX0.EqEp3ZZmiP0wV8qW5daqi1xScH2zB9ziJGaNlha2HsCCBF9JUXS4k_YfIWvCn_lTYgxDM0TF3ZruJh0hbMEI9A' ;

     //   if (token) {
     //       config.headers.Authorization = token;
     //   }
        return config;
    },
    (error) => {
        throw error;
    }
);

conApi.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {

        // if (error.response && error.response.status === 401) {
        //     store.dispatch(logout());
            
        // }
        throw error;
    }
);

export default conApi;
