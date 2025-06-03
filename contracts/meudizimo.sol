// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MeuDizimo {
    address public dono;

    event DizimoEnviado(
        address indexed doador,
        address indexed igreja,
        uint256 valor,
        uint256 timestamp
    );

    constructor() {
        dono = msg.sender;
    }

    function enviarDizimo(address igreja) external payable {
        require(msg.value > 0, "Valor deve ser maior que zero");
        require(igreja != address(0), "Endereco da igreja invalido");

        payable(igreja).transfer(msg.value);

        emit DizimoEnviado(msg.sender, igreja, msg.value, block.timestamp);
    }
}
