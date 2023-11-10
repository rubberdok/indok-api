import type { DocumentNode } from "graphql";
export const typeDefs = {
  kind: "Document",
  definitions: [
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "RedirectUrlResponse", loc: { start: 5, end: 24 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "url", loc: { start: 29, end: 32 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 34, end: 40 } },
              loc: { start: 34, end: 40 },
            },
            loc: { start: 34, end: 41 },
          },
          directives: [],
          loc: { start: 29, end: 41 },
        },
      ],
      loc: { start: 0, end: 43 },
    },
    {
      kind: "EnumTypeDefinition",
      name: { kind: "Name", value: "LogoutStatus", loc: { start: 50, end: 62 } },
      directives: [],
      values: [
        {
          kind: "EnumValueDefinition",
          name: { kind: "Name", value: "SUCCESS", loc: { start: 67, end: 74 } },
          directives: [],
          loc: { start: 67, end: 74 },
        },
        {
          kind: "EnumValueDefinition",
          name: { kind: "Name", value: "ERROR", loc: { start: 77, end: 82 } },
          directives: [],
          loc: { start: 77, end: 82 },
        },
      ],
      loc: { start: 45, end: 84 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "LogoutResponse", loc: { start: 91, end: 105 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "status", loc: { start: 110, end: 116 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "LogoutStatus", loc: { start: 118, end: 130 } },
              loc: { start: 118, end: 130 },
            },
            loc: { start: 118, end: 131 },
          },
          directives: [],
          loc: { start: 110, end: 131 },
        },
      ],
      loc: { start: 86, end: 133 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Mutation", loc: { start: 140, end: 148 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "redirectUrl", loc: { start: 153, end: 164 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "state", loc: { start: 165, end: 170 } },
              type: {
                kind: "NamedType",
                name: { kind: "Name", value: "String", loc: { start: 172, end: 178 } },
                loc: { start: 172, end: 178 },
              },
              directives: [],
              loc: { start: 165, end: 178 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "RedirectUrlResponse", loc: { start: 181, end: 200 } },
              loc: { start: 181, end: 200 },
            },
            loc: { start: 181, end: 201 },
          },
          directives: [],
          loc: { start: 153, end: 201 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "authenticate", loc: { start: 204, end: 216 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "code", loc: { start: 217, end: 221 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "String", loc: { start: 223, end: 229 } },
                  loc: { start: 223, end: 229 },
                },
                loc: { start: 223, end: 230 },
              },
              directives: [],
              loc: { start: 217, end: 230 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "UserResponse", loc: { start: 233, end: 245 } },
              loc: { start: 233, end: 245 },
            },
            loc: { start: 233, end: 246 },
          },
          directives: [],
          loc: { start: 204, end: 246 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "logout", loc: { start: 249, end: 255 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "LogoutResponse", loc: { start: 257, end: 271 } },
              loc: { start: 257, end: 271 },
            },
            loc: { start: 257, end: 272 },
          },
          directives: [],
          loc: { start: 249, end: 272 },
        },
      ],
      loc: { start: 135, end: 274 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Query", loc: { start: 280, end: 285 } },
      interfaces: [],
      directives: [],
      fields: [],
      loc: { start: 275, end: 285 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Mutation", loc: { start: 292, end: 300 } },
      interfaces: [],
      directives: [],
      fields: [],
      loc: { start: 287, end: 300 },
    },
    {
      kind: "ScalarTypeDefinition",
      name: { kind: "Name", value: "DateTime", loc: { start: 309, end: 317 } },
      directives: [],
      loc: { start: 302, end: 317 },
    },
    {
      kind: "InputObjectTypeDefinition",
      name: { kind: "Name", value: "NewBookingInput", loc: { start: 324, end: 339 } },
      directives: [],
      fields: [
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "cabinId", loc: { start: 344, end: 351 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 353, end: 355 } },
              loc: { start: 353, end: 355 },
            },
            loc: { start: 353, end: 356 },
          },
          directives: [],
          loc: { start: 344, end: 356 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "startDate", loc: { start: 359, end: 368 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "DateTime", loc: { start: 370, end: 378 } },
              loc: { start: 370, end: 378 },
            },
            loc: { start: 370, end: 379 },
          },
          directives: [],
          loc: { start: 359, end: 379 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "endDate", loc: { start: 382, end: 389 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "DateTime", loc: { start: 391, end: 399 } },
              loc: { start: 391, end: 399 },
            },
            loc: { start: 391, end: 400 },
          },
          directives: [],
          loc: { start: 382, end: 400 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "firstName", loc: { start: 403, end: 412 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 414, end: 420 } },
              loc: { start: 414, end: 420 },
            },
            loc: { start: 414, end: 421 },
          },
          directives: [],
          loc: { start: 403, end: 421 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "lastName", loc: { start: 424, end: 432 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 434, end: 440 } },
              loc: { start: 434, end: 440 },
            },
            loc: { start: 434, end: 441 },
          },
          directives: [],
          loc: { start: 424, end: 441 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "email", loc: { start: 444, end: 449 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 451, end: 457 } },
              loc: { start: 451, end: 457 },
            },
            loc: { start: 451, end: 458 },
          },
          directives: [],
          loc: { start: 444, end: 458 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "phoneNumber", loc: { start: 461, end: 472 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 474, end: 480 } },
              loc: { start: 474, end: 480 },
            },
            loc: { start: 474, end: 481 },
          },
          directives: [],
          loc: { start: 461, end: 481 },
        },
      ],
      loc: { start: 318, end: 483 },
    },
    {
      kind: "InputObjectTypeDefinition",
      name: { kind: "Name", value: "UpdateBookingStatusInput", loc: { start: 491, end: 515 } },
      directives: [],
      fields: [
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "id", loc: { start: 520, end: 522 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 524, end: 526 } },
              loc: { start: 524, end: 526 },
            },
            loc: { start: 524, end: 527 },
          },
          directives: [],
          loc: { start: 520, end: 527 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "status", loc: { start: 530, end: 536 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Status", loc: { start: 538, end: 544 } },
              loc: { start: 538, end: 544 },
            },
            loc: { start: 538, end: 545 },
          },
          directives: [],
          loc: { start: 530, end: 545 },
        },
      ],
      loc: { start: 485, end: 547 },
    },
    {
      kind: "EnumTypeDefinition",
      name: { kind: "Name", value: "Status", loc: { start: 554, end: 560 } },
      directives: [],
      values: [
        {
          kind: "EnumValueDefinition",
          name: { kind: "Name", value: "PENDING", loc: { start: 565, end: 572 } },
          directives: [],
          loc: { start: 565, end: 572 },
        },
        {
          kind: "EnumValueDefinition",
          name: { kind: "Name", value: "CONFIRMED", loc: { start: 575, end: 584 } },
          directives: [],
          loc: { start: 575, end: 584 },
        },
        {
          kind: "EnumValueDefinition",
          name: { kind: "Name", value: "CANCELLED", loc: { start: 587, end: 596 } },
          directives: [],
          loc: { start: 587, end: 596 },
        },
        {
          kind: "EnumValueDefinition",
          name: { kind: "Name", value: "REJECTED", loc: { start: 599, end: 607 } },
          directives: [],
          loc: { start: 599, end: 607 },
        },
      ],
      loc: { start: 549, end: 609 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Mutation", loc: { start: 616, end: 624 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "newBooking", loc: { start: 629, end: 639 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "data", loc: { start: 640, end: 644 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "NewBookingInput", loc: { start: 646, end: 661 } },
                  loc: { start: 646, end: 661 },
                },
                loc: { start: 646, end: 662 },
              },
              directives: [],
              loc: { start: 640, end: 662 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Booking", loc: { start: 665, end: 672 } },
              loc: { start: 665, end: 672 },
            },
            loc: { start: 665, end: 673 },
          },
          directives: [],
          loc: { start: 629, end: 673 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "updateBookingStatus", loc: { start: 676, end: 695 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "data", loc: { start: 696, end: 700 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "UpdateBookingStatusInput", loc: { start: 702, end: 726 } },
                  loc: { start: 702, end: 726 },
                },
                loc: { start: 702, end: 727 },
              },
              directives: [],
              loc: { start: 696, end: 727 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Booking", loc: { start: 730, end: 737 } },
              loc: { start: 730, end: 737 },
            },
            loc: { start: 730, end: 738 },
          },
          directives: [],
          loc: { start: 676, end: 738 },
        },
      ],
      loc: { start: 611, end: 740 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Cabin", loc: { start: 747, end: 752 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "id", loc: { start: 757, end: 759 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 761, end: 763 } },
              loc: { start: 761, end: 763 },
            },
            loc: { start: 761, end: 764 },
          },
          directives: [],
          loc: { start: 757, end: 764 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "name", loc: { start: 767, end: 771 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 773, end: 779 } },
              loc: { start: 773, end: 779 },
            },
            loc: { start: 773, end: 780 },
          },
          directives: [],
          loc: { start: 767, end: 780 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "internalPrice", loc: { start: 783, end: 796 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Int", loc: { start: 798, end: 801 } },
              loc: { start: 798, end: 801 },
            },
            loc: { start: 798, end: 802 },
          },
          directives: [],
          loc: { start: 783, end: 802 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "externalPrice", loc: { start: 805, end: 818 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Int", loc: { start: 820, end: 823 } },
              loc: { start: 820, end: 823 },
            },
            loc: { start: 820, end: 824 },
          },
          directives: [],
          loc: { start: 805, end: 824 },
        },
      ],
      loc: { start: 742, end: 826 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Booking", loc: { start: 833, end: 840 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "id", loc: { start: 845, end: 847 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 849, end: 851 } },
              loc: { start: 849, end: 851 },
            },
            loc: { start: 849, end: 852 },
          },
          directives: [],
          loc: { start: 845, end: 852 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "endDate", loc: { start: 855, end: 862 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "DateTime", loc: { start: 864, end: 872 } },
              loc: { start: 864, end: 872 },
            },
            loc: { start: 864, end: 873 },
          },
          directives: [],
          loc: { start: 855, end: 873 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "startDate", loc: { start: 876, end: 885 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "DateTime", loc: { start: 887, end: 895 } },
              loc: { start: 887, end: 895 },
            },
            loc: { start: 887, end: 896 },
          },
          directives: [],
          loc: { start: 876, end: 896 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "firstName", loc: { start: 899, end: 908 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 910, end: 916 } },
              loc: { start: 910, end: 916 },
            },
            loc: { start: 910, end: 917 },
          },
          directives: [],
          loc: { start: 899, end: 917 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "lastName", loc: { start: 920, end: 928 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 930, end: 936 } },
              loc: { start: 930, end: 936 },
            },
            loc: { start: 930, end: 937 },
          },
          directives: [],
          loc: { start: 920, end: 937 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "email", loc: { start: 940, end: 945 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 947, end: 953 } },
              loc: { start: 947, end: 953 },
            },
            loc: { start: 947, end: 954 },
          },
          directives: [],
          loc: { start: 940, end: 954 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "phoneNumber", loc: { start: 957, end: 968 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 970, end: 976 } },
              loc: { start: 970, end: 976 },
            },
            loc: { start: 970, end: 977 },
          },
          directives: [],
          loc: { start: 957, end: 977 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "cabin", loc: { start: 980, end: 985 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Cabin", loc: { start: 987, end: 992 } },
              loc: { start: 987, end: 992 },
            },
            loc: { start: 987, end: 993 },
          },
          directives: [],
          loc: { start: 980, end: 993 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "status", loc: { start: 996, end: 1002 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Status", loc: { start: 1004, end: 1010 } },
              loc: { start: 1004, end: 1010 },
            },
            loc: { start: 1004, end: 1011 },
          },
          directives: [],
          loc: { start: 996, end: 1011 },
        },
      ],
      loc: { start: 828, end: 1013 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Organization", loc: { start: 1019, end: 1031 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "id", loc: { start: 1036, end: 1038 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 1040, end: 1042 } },
              loc: { start: 1040, end: 1042 },
            },
            loc: { start: 1040, end: 1043 },
          },
          directives: [],
          loc: { start: 1036, end: 1043 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "name", loc: { start: 1046, end: 1050 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 1052, end: 1058 } },
              loc: { start: 1052, end: 1058 },
            },
            loc: { start: 1052, end: 1059 },
          },
          directives: [],
          loc: { start: 1046, end: 1059 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "description", loc: { start: 1062, end: 1073 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 1075, end: 1081 } },
              loc: { start: 1075, end: 1081 },
            },
            loc: { start: 1075, end: 1082 },
          },
          directives: [],
          loc: { start: 1062, end: 1082 },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "The members of the organization",
            block: true,
            loc: { start: 1085, end: 1130 },
          },
          name: { kind: "Name", value: "members", loc: { start: 1133, end: 1140 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "Member", loc: { start: 1143, end: 1149 } },
                  loc: { start: 1143, end: 1149 },
                },
                loc: { start: 1143, end: 1150 },
              },
              loc: { start: 1142, end: 1151 },
            },
            loc: { start: 1142, end: 1152 },
          },
          directives: [],
          loc: { start: 1085, end: 1152 },
        },
      ],
      loc: { start: 1014, end: 1154 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Member", loc: { start: 1161, end: 1167 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "id", loc: { start: 1172, end: 1174 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 1176, end: 1178 } },
              loc: { start: 1176, end: 1178 },
            },
            loc: { start: 1176, end: 1179 },
          },
          directives: [],
          loc: { start: 1172, end: 1179 },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "The user that is a member of the organization",
            block: true,
            loc: { start: 1182, end: 1241 },
          },
          name: { kind: "Name", value: "user", loc: { start: 1244, end: 1248 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "User", loc: { start: 1250, end: 1254 } },
              loc: { start: 1250, end: 1254 },
            },
            loc: { start: 1250, end: 1255 },
          },
          directives: [],
          loc: { start: 1182, end: 1255 },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "The organization the member is a member of",
            block: true,
            loc: { start: 1258, end: 1314 },
          },
          name: { kind: "Name", value: "organization", loc: { start: 1317, end: 1329 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Organization", loc: { start: 1331, end: 1343 } },
              loc: { start: 1331, end: 1343 },
            },
            loc: { start: 1331, end: 1344 },
          },
          directives: [],
          loc: { start: 1258, end: 1344 },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "The role of the member in the organization",
            block: true,
            loc: { start: 1347, end: 1403 },
          },
          name: { kind: "Name", value: "role", loc: { start: 1406, end: 1410 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Role", loc: { start: 1412, end: 1416 } },
              loc: { start: 1412, end: 1416 },
            },
            loc: { start: 1412, end: 1417 },
          },
          directives: [],
          loc: { start: 1347, end: 1417 },
        },
      ],
      loc: { start: 1156, end: 1419 },
    },
    {
      kind: "EnumTypeDefinition",
      name: { kind: "Name", value: "Role", loc: { start: 1426, end: 1430 } },
      directives: [],
      values: [
        {
          kind: "EnumValueDefinition",
          description: {
            kind: "StringValue",
            value:
              "An admin of the organization, can do everything a member can,\n# and can also manage members in the organization and delete the organization.",
            block: true,
            loc: { start: 1435, end: 1593 },
          },
          name: { kind: "Name", value: "ADMIN", loc: { start: 1596, end: 1601 } },
          directives: [],
          loc: { start: 1435, end: 1601 },
        },
        {
          kind: "EnumValueDefinition",
          description: {
            kind: "StringValue",
            value:
              "A member of the organization, can do everything except\nmanage members in the organization and delete the organization.",
            block: true,
            loc: { start: 1604, end: 1740 },
          },
          name: { kind: "Name", value: "MEMBER", loc: { start: 1743, end: 1749 } },
          directives: [],
          loc: { start: 1604, end: 1749 },
        },
      ],
      loc: { start: 1421, end: 1751 },
    },
    {
      kind: "InputObjectTypeDefinition",
      name: { kind: "Name", value: "UpdateOrganizationInput", loc: { start: 1759, end: 1782 } },
      directives: [],
      fields: [
        {
          kind: "InputValueDefinition",
          description: {
            kind: "StringValue",
            value: "The ID of the organization to update",
            block: true,
            loc: { start: 1787, end: 1837 },
          },
          name: { kind: "Name", value: "id", loc: { start: 1840, end: 1842 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 1844, end: 1846 } },
              loc: { start: 1844, end: 1846 },
            },
            loc: { start: 1844, end: 1847 },
          },
          directives: [],
          loc: { start: 1787, end: 1847 },
        },
        {
          kind: "InputValueDefinition",
          description: {
            kind: "StringValue",
            value: "The new name of the organization\nOmitting the value or passing null will leave the name unchanged",
            block: true,
            loc: { start: 1850, end: 1965 },
          },
          name: { kind: "Name", value: "name", loc: { start: 1968, end: 1972 } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "String", loc: { start: 1974, end: 1980 } },
            loc: { start: 1974, end: 1980 },
          },
          directives: [],
          loc: { start: 1850, end: 1980 },
        },
        {
          kind: "InputValueDefinition",
          description: {
            kind: "StringValue",
            value:
              "The new description of the organization, cannot exceed 10 000 characters\nOmitting the value or passing null will leave the description unchanged",
            block: true,
            loc: { start: 1983, end: 2145 },
          },
          name: { kind: "Name", value: "description", loc: { start: 2148, end: 2159 } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "String", loc: { start: 2161, end: 2167 } },
            loc: { start: 2161, end: 2167 },
          },
          directives: [],
          loc: { start: 1983, end: 2167 },
        },
      ],
      loc: { start: 1753, end: 2169 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "UpdateOrganizationResponse", loc: { start: 2176, end: 2202 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "organization", loc: { start: 2207, end: 2219 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Organization", loc: { start: 2221, end: 2233 } },
              loc: { start: 2221, end: 2233 },
            },
            loc: { start: 2221, end: 2234 },
          },
          directives: [],
          loc: { start: 2207, end: 2234 },
        },
      ],
      loc: { start: 2171, end: 2236 },
    },
    {
      kind: "InputObjectTypeDefinition",
      name: { kind: "Name", value: "CreateOrganizationInput", loc: { start: 2244, end: 2267 } },
      directives: [],
      fields: [
        {
          kind: "InputValueDefinition",
          description: {
            kind: "StringValue",
            value: "The name of the organization, must be unique and between 1 and 100 characters",
            block: true,
            loc: { start: 2272, end: 2363 },
          },
          name: { kind: "Name", value: "name", loc: { start: 2366, end: 2370 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 2372, end: 2378 } },
              loc: { start: 2372, end: 2378 },
            },
            loc: { start: 2372, end: 2379 },
          },
          directives: [],
          loc: { start: 2272, end: 2379 },
        },
        {
          kind: "InputValueDefinition",
          description: {
            kind: "StringValue",
            value: "The description of the organization, cannot exceed 10 000 characters",
            block: true,
            loc: { start: 2382, end: 2464 },
          },
          name: { kind: "Name", value: "description", loc: { start: 2467, end: 2478 } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "String", loc: { start: 2480, end: 2486 } },
            loc: { start: 2480, end: 2486 },
          },
          directives: [],
          loc: { start: 2382, end: 2486 },
        },
      ],
      loc: { start: 2238, end: 2488 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "CreateOrganizationResponse", loc: { start: 2495, end: 2521 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "organization", loc: { start: 2526, end: 2538 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Organization", loc: { start: 2540, end: 2552 } },
              loc: { start: 2540, end: 2552 },
            },
            loc: { start: 2540, end: 2553 },
          },
          directives: [],
          loc: { start: 2526, end: 2553 },
        },
      ],
      loc: { start: 2490, end: 2555 },
    },
    {
      kind: "InputObjectTypeDefinition",
      name: { kind: "Name", value: "AddMemberInput", loc: { start: 2563, end: 2577 } },
      directives: [],
      fields: [
        {
          kind: "InputValueDefinition",
          description: {
            kind: "StringValue",
            value: "The ID of the user to add to the organization",
            block: true,
            loc: { start: 2582, end: 2641 },
          },
          name: { kind: "Name", value: "userId", loc: { start: 2644, end: 2650 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 2652, end: 2654 } },
              loc: { start: 2652, end: 2654 },
            },
            loc: { start: 2652, end: 2655 },
          },
          directives: [],
          loc: { start: 2582, end: 2655 },
        },
        {
          kind: "InputValueDefinition",
          description: {
            kind: "StringValue",
            value: "The ID of the organization to add the user to",
            block: true,
            loc: { start: 2658, end: 2717 },
          },
          name: { kind: "Name", value: "organizationId", loc: { start: 2720, end: 2734 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 2736, end: 2738 } },
              loc: { start: 2736, end: 2738 },
            },
            loc: { start: 2736, end: 2739 },
          },
          directives: [],
          loc: { start: 2658, end: 2739 },
        },
        {
          kind: "InputValueDefinition",
          description: {
            kind: "StringValue",
            value: "The role of the user in the organization, defaults to Role.MEMBER",
            block: true,
            loc: { start: 2742, end: 2821 },
          },
          name: { kind: "Name", value: "role", loc: { start: 2824, end: 2828 } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "Role", loc: { start: 2830, end: 2834 } },
            loc: { start: 2830, end: 2834 },
          },
          directives: [],
          loc: { start: 2742, end: 2834 },
        },
      ],
      loc: { start: 2557, end: 2836 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "AddMemberResponse", loc: { start: 2843, end: 2860 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "member", loc: { start: 2865, end: 2871 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Member", loc: { start: 2873, end: 2879 } },
              loc: { start: 2873, end: 2879 },
            },
            loc: { start: 2873, end: 2880 },
          },
          directives: [],
          loc: { start: 2865, end: 2880 },
        },
      ],
      loc: { start: 2838, end: 2882 },
    },
    {
      kind: "InputObjectTypeDefinition",
      name: { kind: "Name", value: "RemoveMemberInput", loc: { start: 2890, end: 2907 } },
      directives: [],
      fields: [
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "id", loc: { start: 2912, end: 2914 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 2916, end: 2918 } },
              loc: { start: 2916, end: 2918 },
            },
            loc: { start: 2916, end: 2919 },
          },
          directives: [],
          loc: { start: 2912, end: 2919 },
        },
      ],
      loc: { start: 2884, end: 2921 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "RemoveMemberResponse", loc: { start: 2928, end: 2948 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "member", loc: { start: 2953, end: 2959 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Member", loc: { start: 2961, end: 2967 } },
              loc: { start: 2961, end: 2967 },
            },
            loc: { start: 2961, end: 2968 },
          },
          directives: [],
          loc: { start: 2953, end: 2968 },
        },
      ],
      loc: { start: 2923, end: 2970 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Mutation", loc: { start: 2977, end: 2985 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Create a new organization, and add the current user as an admin of the organization.",
            block: true,
            loc: { start: 2990, end: 3088 },
          },
          name: { kind: "Name", value: "createOrganization", loc: { start: 3091, end: 3109 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "data", loc: { start: 3110, end: 3114 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "CreateOrganizationInput", loc: { start: 3116, end: 3139 } },
                  loc: { start: 3116, end: 3139 },
                },
                loc: { start: 3116, end: 3140 },
              },
              directives: [],
              loc: { start: 3110, end: 3140 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "CreateOrganizationResponse", loc: { start: 3143, end: 3169 } },
              loc: { start: 3143, end: 3169 },
            },
            loc: { start: 3143, end: 3170 },
          },
          directives: [],
          loc: { start: 2990, end: 3170 },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "Update an organization with the given name and description.\nPassing null or omitting a value will leave the value unchanged.",
            block: true,
            loc: { start: 3173, end: 3315 },
          },
          name: { kind: "Name", value: "updateOrganization", loc: { start: 3318, end: 3336 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "data", loc: { start: 3337, end: 3341 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "UpdateOrganizationInput", loc: { start: 3343, end: 3366 } },
                  loc: { start: 3343, end: 3366 },
                },
                loc: { start: 3343, end: 3367 },
              },
              directives: [],
              loc: { start: 3337, end: 3367 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "UpdateOrganizationResponse", loc: { start: 3370, end: 3396 } },
              loc: { start: 3370, end: 3396 },
            },
            loc: { start: 3370, end: 3397 },
          },
          directives: [],
          loc: { start: 3173, end: 3397 },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Add a member to the organization",
            block: true,
            loc: { start: 3400, end: 3446 },
          },
          name: { kind: "Name", value: "addMember", loc: { start: 3449, end: 3458 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "data", loc: { start: 3459, end: 3463 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "AddMemberInput", loc: { start: 3465, end: 3479 } },
                  loc: { start: 3465, end: 3479 },
                },
                loc: { start: 3465, end: 3480 },
              },
              directives: [],
              loc: { start: 3459, end: 3480 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AddMemberResponse", loc: { start: 3483, end: 3500 } },
              loc: { start: 3483, end: 3500 },
            },
            loc: { start: 3483, end: 3501 },
          },
          directives: [],
          loc: { start: 3400, end: 3501 },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Remove a member from the organization by the ID of the membership.",
            block: true,
            loc: { start: 3504, end: 3584 },
          },
          name: { kind: "Name", value: "removeMember", loc: { start: 3587, end: 3599 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "data", loc: { start: 3600, end: 3604 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "RemoveMemberInput", loc: { start: 3606, end: 3623 } },
                  loc: { start: 3606, end: 3623 },
                },
                loc: { start: 3606, end: 3624 },
              },
              directives: [],
              loc: { start: 3600, end: 3624 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "RemoveMemberResponse", loc: { start: 3627, end: 3647 } },
              loc: { start: 3627, end: 3647 },
            },
            loc: { start: 3627, end: 3648 },
          },
          directives: [],
          loc: { start: 3504, end: 3648 },
        },
      ],
      loc: { start: 2972, end: 3650 },
    },
    {
      kind: "InputObjectTypeDefinition",
      name: { kind: "Name", value: "UpdateUserInput", loc: { start: 3657, end: 3672 } },
      directives: [],
      fields: [
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "firstName", loc: { start: 3677, end: 3686 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 3688, end: 3694 } },
              loc: { start: 3688, end: 3694 },
            },
            loc: { start: 3688, end: 3695 },
          },
          directives: [],
          loc: { start: 3677, end: 3695 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "lastName", loc: { start: 3698, end: 3706 } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 3708, end: 3714 } },
              loc: { start: 3708, end: 3714 },
            },
            loc: { start: 3708, end: 3715 },
          },
          directives: [],
          loc: { start: 3698, end: 3715 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "phoneNumber", loc: { start: 3718, end: 3729 } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "String", loc: { start: 3731, end: 3737 } },
            loc: { start: 3731, end: 3737 },
          },
          directives: [],
          loc: { start: 3718, end: 3737 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "allergies", loc: { start: 3740, end: 3749 } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "String", loc: { start: 3751, end: 3757 } },
            loc: { start: 3751, end: 3757 },
          },
          directives: [],
          loc: { start: 3740, end: 3757 },
        },
        {
          kind: "InputValueDefinition",
          name: { kind: "Name", value: "graduationYear", loc: { start: 3760, end: 3774 } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "Int", loc: { start: 3776, end: 3779 } },
            loc: { start: 3776, end: 3779 },
          },
          directives: [],
          loc: { start: 3760, end: 3779 },
        },
      ],
      loc: { start: 3651, end: 3781 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "UsersResponse", loc: { start: 3788, end: 3801 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "users", loc: { start: 3806, end: 3811 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "User", loc: { start: 3814, end: 3818 } },
                  loc: { start: 3814, end: 3818 },
                },
                loc: { start: 3814, end: 3819 },
              },
              loc: { start: 3813, end: 3820 },
            },
            loc: { start: 3813, end: 3821 },
          },
          directives: [],
          loc: { start: 3806, end: 3821 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "total", loc: { start: 3824, end: 3829 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Int", loc: { start: 3831, end: 3834 } },
              loc: { start: 3831, end: 3834 },
            },
            loc: { start: 3831, end: 3835 },
          },
          directives: [],
          loc: { start: 3824, end: 3835 },
        },
      ],
      loc: { start: 3783, end: 3837 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "UserResponse", loc: { start: 3844, end: 3856 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "user", loc: { start: 3861, end: 3865 } },
          arguments: [],
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "User", loc: { start: 3867, end: 3871 } },
            loc: { start: 3867, end: 3871 },
          },
          directives: [],
          loc: { start: 3861, end: 3871 },
        },
      ],
      loc: { start: 3839, end: 3873 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Query", loc: { start: 3880, end: 3885 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "user", loc: { start: 3890, end: 3894 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "UserResponse", loc: { start: 3896, end: 3908 } },
              loc: { start: 3896, end: 3908 },
            },
            loc: { start: 3896, end: 3909 },
          },
          directives: [],
          loc: { start: 3890, end: 3909 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "users", loc: { start: 3912, end: 3917 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "UsersResponse", loc: { start: 3919, end: 3932 } },
              loc: { start: 3919, end: 3932 },
            },
            loc: { start: 3919, end: 3933 },
          },
          directives: [],
          loc: { start: 3912, end: 3933 },
        },
      ],
      loc: { start: 3875, end: 3935 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Mutation", loc: { start: 3942, end: 3950 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "updateUser", loc: { start: 3955, end: 3965 } },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "id", loc: { start: 3966, end: 3968 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "ID", loc: { start: 3970, end: 3972 } },
                  loc: { start: 3970, end: 3972 },
                },
                loc: { start: 3970, end: 3973 },
              },
              directives: [],
              loc: { start: 3966, end: 3973 },
            },
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "data", loc: { start: 3975, end: 3979 } },
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "UpdateUserInput", loc: { start: 3981, end: 3996 } },
                  loc: { start: 3981, end: 3996 },
                },
                loc: { start: 3981, end: 3997 },
              },
              directives: [],
              loc: { start: 3975, end: 3997 },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "User", loc: { start: 4000, end: 4004 } },
              loc: { start: 4000, end: 4004 },
            },
            loc: { start: 4000, end: 4005 },
          },
          directives: [],
          loc: { start: 3955, end: 4005 },
        },
      ],
      loc: { start: 3937, end: 4007 },
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "User", loc: { start: 4014, end: 4018 } },
      interfaces: [],
      directives: [],
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "id", loc: { start: 4023, end: 4025 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ID", loc: { start: 4027, end: 4029 } },
              loc: { start: 4027, end: 4029 },
            },
            loc: { start: 4027, end: 4030 },
          },
          directives: [],
          loc: { start: 4023, end: 4030 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "lastName", loc: { start: 4033, end: 4041 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 4043, end: 4049 } },
              loc: { start: 4043, end: 4049 },
            },
            loc: { start: 4043, end: 4050 },
          },
          directives: [],
          loc: { start: 4033, end: 4050 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "firstName", loc: { start: 4053, end: 4062 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 4064, end: 4070 } },
              loc: { start: 4064, end: 4070 },
            },
            loc: { start: 4064, end: 4071 },
          },
          directives: [],
          loc: { start: 4053, end: 4071 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "username", loc: { start: 4074, end: 4082 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String", loc: { start: 4084, end: 4090 } },
              loc: { start: 4084, end: 4090 },
            },
            loc: { start: 4084, end: 4091 },
          },
          directives: [],
          loc: { start: 4074, end: 4091 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "createdAt", loc: { start: 4094, end: 4103 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "DateTime", loc: { start: 4105, end: 4113 } },
              loc: { start: 4105, end: 4113 },
            },
            loc: { start: 4105, end: 4114 },
          },
          directives: [],
          loc: { start: 4094, end: 4114 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "firstLogin", loc: { start: 4117, end: 4127 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Boolean", loc: { start: 4129, end: 4136 } },
              loc: { start: 4129, end: 4136 },
            },
            loc: { start: 4129, end: 4137 },
          },
          directives: [],
          loc: { start: 4117, end: 4137 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "canUpdateYear", loc: { start: 4140, end: 4153 } },
          arguments: [],
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "Boolean", loc: { start: 4155, end: 4162 } },
              loc: { start: 4155, end: 4162 },
            },
            loc: { start: 4155, end: 4163 },
          },
          directives: [],
          loc: { start: 4140, end: 4163 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "graduationYear", loc: { start: 4166, end: 4180 } },
          arguments: [],
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "Int", loc: { start: 4182, end: 4185 } },
            loc: { start: 4182, end: 4185 },
          },
          directives: [],
          loc: { start: 4166, end: 4185 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "phoneNumber", loc: { start: 4188, end: 4199 } },
          arguments: [],
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "String", loc: { start: 4201, end: 4207 } },
            loc: { start: 4201, end: 4207 },
          },
          directives: [],
          loc: { start: 4188, end: 4207 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "allergies", loc: { start: 4210, end: 4219 } },
          arguments: [],
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "String", loc: { start: 4221, end: 4227 } },
            loc: { start: 4221, end: 4227 },
          },
          directives: [],
          loc: { start: 4210, end: 4227 },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "graduationYearUpdatedAt", loc: { start: 4230, end: 4253 } },
          arguments: [],
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "DateTime", loc: { start: 4255, end: 4263 } },
            loc: { start: 4255, end: 4263 },
          },
          directives: [],
          loc: { start: 4230, end: 4263 },
        },
      ],
      loc: { start: 4009, end: 4265 },
    },
  ],
  loc: { start: 0, end: 4266 },
} as unknown as DocumentNode;
