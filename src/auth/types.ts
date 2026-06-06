export type ConnectionStringContext = {
  connectionString: string;
};

export type NamespaceContext = {
  namespace: string;
};

export type AsbContext = ConnectionStringContext | NamespaceContext;

export type AsbConfig = {
  currentContext?: string;
  contexts: Record<string, AsbContext>;
};
