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
    "name": "doarDizimo",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "doador", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "igreja", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "valor", "type": "uint256" }
    ],
    "name": "DizimoEnviado",
    "type": "event"
  }
];

function App() {
  const [wallet, setWallet] = useState(null);
  const [igrejaAddress, setIgrejaAddress] = useState("");
  const [valorEth, setValorEth] = useState("");
  const [message, setMessage] = useState("");
  const [historico, setHistorico] = useState([]);

  // Conectar MetaMask
  const conectarCarteira = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWallet(accounts[0]);
        setMessage("Carteira conectada: " + accounts[0]);
      } catch (err) {
        setMessage("Erro ao conectar a carteira.");
      }
    } else {
      setMessage("MetaMask não detectado.");
    }
  };

  // Enviar dízimo
  const doar = async () => {
    if (!ethers.isAddress(igrejaAddress)) {
      setMessage("Endereço da igreja inválido.");
      return;
    }

    if (!valorEth || isNaN(parseFloat(valorEth))) {
      setMessage("Valor inválido.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contrato = new ethers.Contract(contratoEndereco, contratoABI, signer);
      const tx = await contrato.doarDizimo(igrejaAddress, {
        value: ethers.parseEther(valorEth)
      });

      setMessage("Transação enviada! Aguardando confirmação...");
      await tx.wait();
      setMessage("Dízimo enviado com sucesso!");
    } catch (error) {
      console.error(error);
      setMessage("Erro ao enviar o dízimo.");
    }
  };

  // Escutar eventos
  useEffect(() => {
    const escutarEventos = async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contrato = new ethers.Contract(contratoEndereco, contratoABI, provider);

      contrato.on("DizimoEnviado", (doador, igreja, valor, evento) => {
        const eth = ethers.formatEther(valor);
        setHistorico((prev) => [
          {
            doador,
            igreja,
            valor: eth,
            timestamp: new Date().toLocaleString(),
            txHash: evento.transactionHash
          },
          ...prev
        ]);
      });
    };

    escutarEventos();

    return () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contrato = new ethers.Contract(contratoEndereco, contratoABI, provider);
        contrato.removeAllListeners("DizimoEnviado");
      }
    };
  }, []);

  return (
    <div className="App">
      <h1>🙏 Meu Dízimo (BNB Testnet)</h1>

      {!wallet ? (
        <button onClick={conectarCarteira}>Conectar Carteira</button>
      ) : (
        <p><strong>Carteira:</strong> {wallet}</p>
      )}

      <div className="formulario">
        <input
          type="text"
          placeholder="Endereço da igreja"
          value={igrejaAddress}
          onChange={(e) => setIgrejaAddress(e.target.value)}
        />
        <input
          type="text"
          placeholder="0.01 ETH/BNB"
          value={valorEth}
          onChange={(e) => setValorEth(e.target.value)}
        />
        <button onClick={doar}>Enviar Dízimo</button>
      </div>

      {message && <p className="mensagem">{message}</p>}

      <hr />

      <section className="historico">
        <h2>Histórico de Doações</h2>
        {historico.length === 0 ? (
          <p>Nenhum evento registrado...</p>
        ) : (
          <ul>
            {historico.map((item, index) => (
              <li key={index}>
                <strong>{item.valor} ETH</strong> para <code>{item.igreja}</code><br />
                <small>Doador: {item.doador}</small><br />
                <small>{item.timestamp}</small><br />
                <a
                  href={`https://testnet.bscscan.com/tx/${item.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver Transação
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
