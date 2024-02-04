%lang starknet

@contract_interface
namespace IIdentityStorage:
    func store_identity(user_hash: felt, user_address: felt):
    end

    func verify_identity(user_hash: felt) -> (exists: felt):
    end
end

@storage_var
func identities(user_hash: felt) -> (user_address: felt):
end

@external
func store_identity(user_hash: felt, user_address: felt):
    identities.write(user_hash, user_address)
end

@view
func verify_identity(user_hash: felt) -> (exists: felt):
    let (user_address) = identities.read(user_hash)
    return (user_address != 0)
end