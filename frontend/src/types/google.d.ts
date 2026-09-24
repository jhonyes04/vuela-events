interface GoogleCredentialResponse {
    credential: string;
    select_by: string;
}

interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    hd?: string;
    auto_select?: boolean;
}

interface GoogleButtonConfiguration {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill';
    width?: number;
    locale?: string;
}

interface Window {
    google?: {
        accounts: {
            id: {
                initialize: (config: GoogleIdConfiguration) => void;
                renderButton: (
                    parent: HTMLElement,
                    options: GoogleButtonConfiguration,
                ) => void;
                disableAutoSelect: () => void;
            };
        };
    };
}
