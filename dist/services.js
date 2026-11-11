let services = null;
export function setServices(s) {
    services = s;
}
export function getServices() {
    if (!services) {
        throw new Error("famille-core : appelez initFamille(config) avant toute autre fonction.");
    }
    return services;
}
