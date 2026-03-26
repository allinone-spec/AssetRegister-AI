import axios from "axios";
import { baseUrl } from '../Utility/baseUrl';

const api = axios.create({
    baseURL: baseUrl,
});


api.interceptors.request.use(
    (config) => {
        // const { token } = store.getState().auth;
     //   const token  ='Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbkBnbWFpbC5jb20iLCJpYXQiOjE3NDU2NDc0MDgsImV4cCI6MTc0NTczMzgwOH0.mPtQDyLD8SkwcfNZFyL34JpDGRC1rr0L4gMsLPB93BWSqZjUJ1nFVZ-hRBJKi0NpU654aT5fsYUsH7nGN2Y4gg';

     //   if (token) {
     //       config.headers.Authorization = token;
    //    }
        return config;
    },
    (error) => {
        throw error;
    }
);

api.interceptors.response.use(
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

export default api;
