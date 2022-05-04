import {
    BigNumber,
    BigNumberish,
    ContractTransaction,
    EventFilter,
    Signer,
} from "ethers";

interface Filters {
    [name: string]: (args?: any[]) => EventFilter;
}

interface TransactionOverrides {
    value: BigNumberish;
}

interface BaseContract<T> {
    connect(signer: Signer): T;
    address: string;
    filters: Filters;
    once: (event: EventFilter | string, listener: (e: any) => void) => T;
}

type TransactionPromise = Promise<ContractTransaction>;

interface Terms {
    tokenToSatking: string;
}

export interface Staking extends BaseContract<Staking> {
    stake(amount: BigNumberish): TransactionPromise;
    claim(): TransactionPromise;
    unstake(): TransactionPromise;
    terms(): Promise<Terms>;
}

export interface Token extends BaseContract<Token> {
    approve(spender: string, amount: BigNumberish): TransactionPromise;
}

export interface DAO extends BaseContract<DAO> {
    createProposal(
        recepient: string,
        calldata: string,
        description: string
    ): TransactionPromise;

    vote(
        id: BigNumberish,
        amount: BigNumberish,
        voteType: BigNumberish
    ): TransactionPromise;
}

export interface Platform extends BaseContract<Platform> {
    createOrder(amount: number, price: number): TransactionPromise;
    closeOrder(id: number): TransactionPromise;
    buyFromOrder(
        orderId: BigNumberish,
        amount: BigNumberish,
        overrides?: TransactionOverrides
    ): TransactionPromise;
    buyOnSale(overrides?: TransactionOverrides): TransactionPromise;
    price(): Promise<BigNumber>;
    register(referal: string): TransactionPromise;
}
