import ImageKit from "imagekit-javascript";

const imagekit = new ImageKit({
    publicKey: import.meta.env.REACT_APP_IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: import.meta.env.REACT_APP_IMAGEKIT_URL_ENDPOINT,
    authenticationEndpoint: import.meta.env.REACT_APP_IMAGEKIT_AUTH_ENDPOINT,
});

export default imagekit;
