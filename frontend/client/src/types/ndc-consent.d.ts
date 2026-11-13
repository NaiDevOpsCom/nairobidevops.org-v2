export { };

declare global {
    interface Window {
        ndcConsent?: {
            open: () => void;
            status: () => "granted" | "denied" | null;
        };
    }
}