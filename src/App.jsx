import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Endereço do contrato e ABI
const contratoEndereco = "0x38571d51f343Acc3860079eBC9A707e962d8B7DC";
const contratoABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "igreja", "type": "address" }
    ],
    "name": "enviarDizimo", // Corrigido: nome da função deve ser "enviarDizimo" conforme o contrato
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "doador", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "igreja", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "valor", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" } // Adicionado timestamp conforme contrato
    ],
    "name": "DizimoEnviado",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "dono",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Configuração da rede BSC Testnet
const bscTestnet = {
  chainId: "0x61", // 97 em hexadecimal
  chainName: "BSC Testnet",
  nativeCurrency: {
    name: "tBNB",
    symbol: "tBNB",
    decimals: 18
  },
  rpcUrls: [
    "https://data-seed-prebsc-1-s1.binance.org:8545/",
    "https://data-seed-prebsc-2-s1.binance.org:8545/",
    "https://data-seed-prebsc-1-s2.binance.org:8545/"
  ],
  blockExplorerUrls: ["https://testnet.bscscan.com"]
};

// Lista de RPC URLs alternativos para fallback
const rpcUrls = [
  "https://data-seed-prebsc-1-s1.binance.org:8545/",
  "https://data-seed-prebsc-2-s1.binance.org:8545/",
  "https://data-seed-prebsc-1-s2.binance.org:8545/",
  "https://bsc-testnet.publicnode.com",
  "https://bsc-testnet.blockpi.network/v1/rpc/public"
];

function App() {
  const [wallet, setWallet] = useState(null);
  const [igrejaAddress, setIgrejaAddress] = useState("");
  const [valorEth, setValorEth] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // Novo: tipo de mensagem (success, error, info)
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false); // Novo: estado de carregamento
  const [provider, setProvider] = useState(null); // Novo: armazenar provider
  const [currentRpcIndex, setCurrentRpcIndex] = useState(0); // Novo: índice do RPC atual

  // Função para obter provider com fallback para diferentes RPCs
  const getProvider = async () => {
    // Se já temos um provider, retorná-lo
    if (provider) return provider;

    // Tentar cada RPC URL até encontrar um que funcione
    for (let i = currentRpcIndex; i < rpcUrls.length; i++) {
      try {
        // Criar provider personalizado com URL específica
        const customProvider = new ethers.BrowserProvider(window.ethereum, {
          // Forçar o uso de um RPC específico
          url: rpcUrls[i],
          chainId: 97,
          name: 'BSC Testnet'
        });
        
        // Testar o provider
        await customProvider.getBlockNumber();
        
        // Se chegou aqui, o provider está funcionando
        setCurrentRpcIndex(i);
        setProvider(customProvider);
        console.log(`Usando RPC: ${rpcUrls[i]}`);
        return customProvider;
      } catch (error) {
        console.warn(`RPC ${rpcUrls[i]} falhou, tentando próximo...`, error);
        continue;
      }
    }
    
    // Se chegou aqui, nenhum RPC funcionou, tentar o padrão
    console.warn("Todos os RPCs falharam, usando padrão");
    const defaultProvider = new ethers.BrowserProvider(window.ethereum);
    setProvider(defaultProvider);
    return defaultProvider;
  };

  // Verificar se a rede está correta
  const verificarRede = async () => {
    try {
      const provider = await getProvider();
      const { chainId } = await provider.getNetwork();
      
      // BSC Testnet tem chainId 97
      if (chainId !== 97n) {
        try {
          // Tentar mudar para BSC Testnet
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x61' }], // 97 em hexadecimal
          });
          return true;
        } catch (switchError) {
          // Se o erro for que a rede não está adicionada, tentar adicionar
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [bscTestnet],
              });
              return true;
            } catch (addError) {
              console.error("Erro ao adicionar rede:", addError);
              setMessage("Por favor, adicione a BSC Testnet manualmente na sua MetaMask.");
              setMessageType("error");
              return false;
            }
          }
          console.error("Erro ao mudar de rede:", switchError);
          setMessage("Por favor, mude para a BSC Testnet na sua MetaMask.");
          setMessageType("error");
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Erro ao verificar rede:", error);
      return false;
    }
  };

  // Conectar MetaMask
  const conectarCarteira = async () => {
    setLoading(true);
    setMessage("");
    
    if (window.ethereum) {
      try {
        // Solicitar contas
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          setMessage("Carteira conectada com sucesso!");
          setMessageType("success");
          
          // Verificar rede
          const redeCorreta = await verificarRede();
          if (redeCorreta) {
            // Carregar histórico
            await carregarHistorico(accounts[0]);
          }
        }
      } catch (err) {
        console.error("Erro ao conectar carteira:", err);
        setMessage("Erro ao conectar a carteira: " + (err.message || "Erro desconhecido"));
        setMessageType("error");
      }
    } else {
      setMessage("MetaMask não detectado. Por favor, instale a extensão MetaMask.");
      setMessageType("error");
    }
    
    setLoading(false);
  };

  // Carregar histórico de transações
  const carregarHistorico = async (address) => {
    try {
      const provider = await getProvider();
      const contrato = new ethers.Contract(contratoEndereco, contratoABI, provider);
      
      // Filtrar eventos onde o usuário é o doador
      const filtro = contrato.filters.DizimoEnviado(address);
      
      // Buscar eventos (limitado aos últimos 100 blocos para performance)
      const eventos = await contrato.queryFilter(filtro, -100);
      
      // Formatar eventos
      const historicoFormatado = await Promise.all(eventos.map(async (evento) => {
        const [doador, igreja, valor, timestamp] = evento.args;
        
        // Converter timestamp para data legível
        const data = new Date(Number(timestamp) * 1000);
        
        return {
          doador,
          igreja,
          valor: ethers.formatEther(valor),
          timestamp: data.toLocaleString(),
          txHash: evento.transactionHash
        };
      }));
      
      setHistorico(historicoFormatado.reverse()); // Mais recentes primeiro
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  // Enviar dízimo
  const doar = async () => {
    if (!wallet) {
      setMessage("Por favor, conecte sua carteira primeiro.");
      setMessageType("error");
      return;
    }

    if (!ethers.isAddress(igrejaAddress)) {
      setMessage("Endereço da igreja inválido.");
      setMessageType("error");
      return;
    }

    if (!valorEth || isNaN(parseFloat(valorEth)) || parseFloat(valorEth) <= 0) {
      setMessage("Valor inválido. Por favor, insira um valor maior que zero.");
      setMessageType("error");
      return;
    }

    // Verificar rede antes de enviar
    const redeCorreta = await verificarRede();
    if (!redeCorreta) return;

    setLoading(true);
    setMessage("Enviando dízimo, aguarde a confirmação na MetaMask...");
    setMessageType("info");

    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const contrato = new ethers.Contract(contratoEndereco, contratoABI, signer);
      
      // Obter estimativa de gas para evitar erros
      const gasEstimate = await contrato.enviarDizimo.estimateGas(igrejaAddress, {
        value: ethers.parseEther(valorEth)
      });
      
      // Adicionar 20% de margem ao gas estimado
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
      
      // Enviar transação com gas limit explícito
      const tx = await contrato.enviarDizimo(igrejaAddress, {
        value: ethers.parseEther(valorEth),
        gasLimit: gasLimit
      });

      setMessage("Transação enviada! Aguardando confirmação...");
      setMessageType("info");
      
      // Aguardar confirmação
      await tx.wait();
      
      setMessage("Dízimo enviado com sucesso!");
      setMessageType("success");
      
      // Limpar campos
      setIgrejaAddress("");
      setValorEth("");
      
      // Atualizar histórico
      await carregarHistorico(wallet);
    } catch (error) {
      console.error("Erro ao enviar dízimo:", error);
      
      // Mensagens de erro mais amigáveis
      let errorMessage = "Erro ao enviar o dízimo.";
      
      if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transação rejeitada pelo usuário.";
      } else if (error.message && error.message.includes("insufficient funds")) {
        errorMessage = "Saldo insuficiente para enviar o dízimo.";
      } else if (error.message && error.message.includes("limit exceeded")) {
        errorMessage = "Limite de RPC excedido. Tente novamente em alguns instantes.";
        
        // Tentar próximo RPC
        setCurrentRpcIndex((prevIndex) => (prevIndex + 1) % rpcUrls.length);
        setProvider(null);
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Configurar listeners para eventos da MetaMask
  useEffect(() => {
    if (window.ethereum) {
      // Listener para mudança de contas
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // Usuário desconectou
          setWallet(null);
          setMessage("Carteira desconectada.");
          setMessageType("info");
        } else if (accounts[0] !== wallet) {
          // Usuário mudou de conta
          setWallet(accounts[0]);
          setMessage("Conta alterada para: " + accounts[0]);
          setMessageType("info");
          carregarHistorico(accounts[0]);
        }
      };

      // Listener para mudança de rede
      const handleChainChanged = () => {
        // Recarregar a página é a forma mais segura de lidar com mudança de rede
        window.location.reload();
      };

      // Adicionar listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Verificar se já está conectado
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setWallet(accounts[0]);
            verificarRede().then(redeCorreta => {
              if (redeCorreta) {
                carregarHistorico(accounts[0]);
              }
            });
          }
        })
        .catch(console.error);

      // Cleanup function
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [wallet]);

  // Função para obter a classe CSS baseada no tipo de mensagem
  const getMessageClass = () => {
    switch (messageType) {
      case "success": return "alert alert-success";
      case "error": return "alert alert-danger";
      case "info": return "alert alert-info";
      case "warning": return "alert alert-warning";
      default: return "alert alert-secondary";
    }
  };

  return (
    <div className="container my-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h1 className="text-center">🙏 Meu Dízimo (BNB Testnet)</h1>
            </div>
            
            <div className="card-body">
              {message && (
                <div className={getMessageClass()} role="alert">
                  {message}
                </div>
              )}

              {!wallet ? (
                <div className="text-center mb-4">
                  <button 
                    className="btn btn-primary btn-lg" 
                    onClick={conectarCarteira}
                    disabled={loading}
                  >
                    {loading ? 'Conectando...' : 'Conectar Carteira'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="alert alert-info mb-4">
                    <strong>Carteira conectada:</strong> {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 4)}
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); doar(); }} className="mb-4">
                    <div className="mb-3">
                      <label htmlFor="igrejaAddress" className="form-label">Endereço da Igreja</label>
                      <input
                        type="text"
                        className="form-control"
                        id="igrejaAddress"
                        placeholder="0x..."
                        value={igrejaAddress}
                        onChange={(e) => setIgrejaAddress(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="valorEth" className="form-label">Valor do Dízimo (BNB)</label>
                      <input
                        type="number"
                        className="form-control"
                        id="valorEth"
                        placeholder="0.01"
                        step="0.000000000000000001"
                        min="0.000000000000000001"
                        value={valorEth}
                        onChange={(e) => setValorEth(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="d-grid">
                      <button 
                        type="submit" 
                        className="btn btn-success btn-lg"
                        disabled={loading}
                      >
                        {loading ? 'Processando...' : 'Enviar Dízimo'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              <hr />

              <div className="historico mt-4">
                <h2>Histórico de Doações</h2>
                {historico.length === 0 ? (
                  <p className="text-muted">Nenhuma doação registrada...</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Igreja</th>
                          <th>Valor (BNB)</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historico.map((item, index) => (
                          <tr key={index}>
                            <td>{item.timestamp}</td>
                            <td>{item.igreja.substring(0, 6)}...{item.igreja.substring(item.igreja.length - 4)}</td>
                            <td>{item.valor}</td>
                            <td>
                              <a
                                href={`https://testnet.bscscan.com/tx/${item.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                Ver Transação
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card-footer text-center text-muted">
              <p className="mb-0">Transparência e segurança nas doações com blockchain</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
