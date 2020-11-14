import { buildSchema } from 'graphql';

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
export const graphqlSchema = buildSchema(`
	# Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

	# This "Module" type defines the queryable fields for every module in our data source.
	type Module {
		id: ID
		name: String
		version: String
		asarPath: String
		isSystem: Boolean
	}

	type Instance {
		id: ID
		name: String
		version: String
    }
    
    type InstanceEvent {
        type: String
        data: [Instance]
    }

	type Subscription {
		instances: InstanceEvent
	}

	# The "Query" type is special: it lists all of the available queries that
	# clients can execute, along with the return type for each. In this
	# case, the "module" query returns an array of zero or more Modules (defined above).
	type Query {
		modules: [Module]
	}
`);
