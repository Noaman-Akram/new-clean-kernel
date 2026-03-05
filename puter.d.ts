export {};

declare global {
  interface Window {
    puter?: {
      ai?: {
        chat?: (
          prompt:
            | string
            | Array<{
                role: 'system' | 'user' | 'assistant';
                content: string;
              }>,
          options?: {
            model?: string;
          }
        ) => Promise<
          | string
          | {
              text?: string;
              message?: {
                content?: string;
              };
            }
        >;
      };
      auth?: {
        isSignedIn?: () => boolean;
        signIn?: (options?: Record<string, unknown>) => Promise<unknown>;
        signOut?: () => Promise<unknown>;
        getUser?: () => Promise<{
          username?: string;
          email?: string;
          uuid?: string;
        } | null>;
      };
    };
  }
}
