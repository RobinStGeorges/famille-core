export declare function signUp(email: string, password: string, displayName: string): Promise<void>;
export declare function signIn(email: string, password: string): Promise<void>;
export declare function signOutUser(): Promise<void>;
export declare function resetPassword(email: string): Promise<void>;
