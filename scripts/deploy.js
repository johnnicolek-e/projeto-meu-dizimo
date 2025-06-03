const { ethers } = require("hardhat");


async function main() {
  const MeuDizimo = await ethers.getContractFactory("MeuDizimo");
  const contrato = await MeuDizimo.deploy();
  await contrato.waitForDeployment();

  console.log(`Contrato implantado em: ${contrato.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});