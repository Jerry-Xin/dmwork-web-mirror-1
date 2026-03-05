

export default class StorageService {
    private constructor() {
    }
    public static shared = new StorageService()

    setItem(key:string,value:string) {
        sessionStorage.setItem(key, value)
    }

    getItem(key:string) {
        return sessionStorage.getItem(key)
    }

    removeItem(key:string) {
        sessionStorage.removeItem(key)
    }
}