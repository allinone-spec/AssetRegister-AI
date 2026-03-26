import axios from "axios";
import { adminConsoleBaseUrl, dataRegisterUrl } from "../Utility/baseUrl";
import toast from "react-hot-toast";

export const setupAxiosInterceptors = () => {};

export const getRequest = async (url) => {
  try {
    const response = await axios.get(`${adminConsoleBaseUrl}${url}`);
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const postDataRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${adminConsoleBaseUrl}${url}`, payload);
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        `${
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong"
        }`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};
export const postMultipartFormRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${adminConsoleBaseUrl}${url}`, payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const postApplicationJsonRequest = async (url, payload) => {
  try {
    const response = await axios.post(`${adminConsoleBaseUrl}${url}`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const patchRequest = async (url, payload) => {
  try {
    const response = await axios.patch(`${adminConsoleBaseUrl}${url}`, payload);
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const patchMultipartFormRequest = async (url, payload) => {
  try {
    const response = await axios.patch(
      `${adminConsoleBaseUrl}${url}`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const deleteRequest = async (url) => {
  try {
    const response = await axios.delete(`${adminConsoleBaseUrl}${url}`);
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const getRegisterRequest = async (url, payload, signal) => {
  try {
    const response = await axios.post(`${dataRegisterUrl}${url}`, payload, {
      signal,
    });
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const getSummaryMatrixRequest = async (objectId, signal) => {
  try {
    const response = await axios.get(
      `${dataRegisterUrl}/AssetRegister/${objectId}/matrix`,
      { signal }
    );
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const getCommonRegisterRequest = async (url) => {
  try {
    const response = await axios.get(`${dataRegisterUrl}${url}`);
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

export const patchCommonRegisterRequest = async (url, payload) => {
  try {
    const response = await axios.patch(`${dataRegisterUrl}${url}`, payload);
    return response;
  } catch (error) {
    error?.status &&
      error?.status !== 401 &&
      toast.error(
        error.status === 500
          ? "Internal Server Error"
          : error?.response?.data?.message
          ? error.response.data.message
          : `Error fetching data: ${error.message || "Something went wrong"}`,
        { id: error.status === 401 ? 401 : undefined }
      );
  }
};

// export const getRegisterModuleApi = (objectId) => {
//   return axios.get(
//     `http://20.244.24.90:8085/api/data/AssetRegister/${objectId}/get`
//   );
// };
