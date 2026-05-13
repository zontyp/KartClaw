--
-- PostgreSQL database dump
--

\restrict uaPbdx5ElOTHJlKrfOKi7oscBkv5eLId4HDjTDbcNsEJrHTgm0cYw70xePWnlPw

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_products_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_products_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id bigint NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    sku text NOT NULL,
    price numeric(12,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    slug text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    CONSTRAINT products_price_non_negative CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_status_valid CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))),
    CONSTRAINT products_stock_non_negative CHECK ((stock >= 0))
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.products ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, uuid, name, description, sku, price, stock, slug, status, created_at, updated_at, image_url) FROM stdin;
1	8572d9b5-e31e-4383-b960-bd6286c99b8e	Neon Cipher Jacket	A lightweight smart-shell jacket with reflective circuit seams and rainproof midnight fabric.	KC-JACKET-NEON-CIPHER	149.00	18	neon-cipher-jacket	active	2026-05-13 14:59:45.649543+00	2026-05-13 14:59:45.649543+00	\N
2	bfb98982-2882-492e-9281-5c1519ec9b00	Ghost Mesh Sneakers	Low-profile street runners with translucent mesh, carbon grip, and quiet-step soles.	KC-SNEAKER-GHOST-MESH	119.00	31	ghost-mesh-sneakers	active	2026-05-13 14:59:45.649543+00	2026-05-13 14:59:45.649543+00	\N
3	faf7a419-2039-4b87-99a3-df627f444d27	Signal Black Cargo Pants	Tapered utility cargos with magnetic pockets, matte hardware, and encrypted-tag styling.	KC-CARGO-SIGNAL-BLACK	98.00	24	signal-black-cargo-pants	active	2026-05-13 14:59:45.649543+00	2026-05-13 14:59:45.649543+00	\N
4	960dfae0-3ab4-429d-ae4d-4edc4f7bfec5	Chrome Veil Hoodie	Oversized thermal hoodie with chrome drawcords and a soft privacy-mask collar.	KC-HOODIE-CHROME-VEIL	89.00	40	chrome-veil-hoodie	active	2026-05-13 14:59:45.649543+00	2026-05-13 14:59:45.649543+00	\N
5	aa72148f-1878-4e24-98c4-4b9b83bf974d	Datastream Utility Vest	Modular vest with quick-access loops and layered panels inspired by server-room geometry.	KC-VEST-DATASTREAM	132.00	12	datastream-utility-vest	active	2026-05-13 14:59:45.649543+00	2026-05-13 14:59:45.649543+00	\N
6	7f6978e1-6b14-46eb-a6e8-d2f877d8b540	Optic Glitch Sunglasses	Angular smoke-lens sunglasses with mirrored edges and a glitch-cut silhouette.	KC-SUN-OPTIC-GLITCH	64.00	55	optic-glitch-sunglasses	active	2026-05-13 14:59:45.649543+00	2026-05-13 14:59:45.649543+00	\N
7	dff89d4f-e955-4b8c-820f-302006403da4	CPU Processor	Starter computer-part product for Pekstore.	CPU-PROCESSOR	199.99	20	cpu	active	2026-05-13 15:22:18.184635+00	2026-05-13 15:22:18.184635+00	/assets/pekstore-parts/cpu.jpg
8	341e67f5-ccb1-4947-b6c8-a15b73770858	Graphics Card	Starter computer-part product for Pekstore.	GRAPHICS-CARD	399.99	8	gpu	active	2026-05-13 15:22:18.189337+00	2026-05-13 15:22:18.189337+00	/assets/pekstore-parts/gpu.jpg
9	7d94f043-b000-4a77-8db2-966cfac286f7	RAM Memory	Starter computer-part product for Pekstore.	RAM-MEMORY	79.99	20	ram	active	2026-05-13 15:22:18.190376+00	2026-05-13 15:22:18.190376+00	/assets/pekstore-parts/ram.jpg
10	85fda02f-e4c1-4261-8d37-28412f24c2af	SSD Drive	Starter computer-part product for Pekstore.	SSD-DRIVE	99.99	20	ssd	active	2026-05-13 15:22:18.191343+00	2026-05-13 15:22:18.191343+00	/assets/pekstore-parts/ssd.jpg
11	94713335-6909-4553-8a84-90ef266294c1	Motherboard	Starter computer-part product for Pekstore.	MOTHERBOARD	149.99	18	motherboard	active	2026-05-13 15:22:18.192239+00	2026-05-13 15:22:18.192239+00	/assets/pekstore-parts/motherboard.jpg
12	9ee65664-7ee3-4a03-8353-133993fc8986	Power Supply	Starter computer-part product for Pekstore.	POWER-SUPPLY	89.99	20	psu	active	2026-05-13 15:22:18.193406+00	2026-05-13 15:22:18.193406+00	/assets/pekstore-parts/psu.jpg
13	d3d2d984-037b-42dc-9083-428c0a11d70e	PC Case	Starter computer-part product for Pekstore.	PC-CASE	69.99	17	case	active	2026-05-13 15:22:18.194316+00	2026-05-13 15:22:18.194316+00	/assets/pekstore-parts/case.jpg
14	1eed397b-9e63-4363-9824-d5c98d34f7be	CPU Cooler	Starter computer-part product for Pekstore.	CPU-COOLER	49.99	18	cooler	active	2026-05-13 15:22:18.195483+00	2026-05-13 15:22:18.195483+00	/assets/pekstore-parts/cooler.jpg
15	d4ced5fb-32e6-4931-bc19-ec2483db4ec9	Monitor	Starter computer-part product for Pekstore.	MONITOR	179.99	19	monitor	active	2026-05-13 15:22:18.196466+00	2026-05-13 15:22:18.196466+00	/assets/pekstore-parts/monitor-square.jpg
16	e0ee7dce-5c91-4900-aa45-9423095342d7	Keyboard	Starter computer-part product for Pekstore.	KEYBOARD	39.99	17	keyboard	active	2026-05-13 15:22:18.197459+00	2026-05-13 15:22:18.197459+00	/assets/pekstore-parts/keyboard.jpg
17	3a29d914-5ff2-48f9-bac0-797d804628fb	Mouse	Starter computer-part product for Pekstore.	MOUSE	24.99	18	mouse	active	2026-05-13 15:22:18.198502+00	2026-05-13 15:22:18.198502+00	/assets/pekstore-parts/mouse.jpg
18	4dd5683f-9dde-4c6c-9b22-7cc61a0dec88	Headset	Starter computer-part product for Pekstore.	HEADSET	59.99	20	headset	active	2026-05-13 15:22:18.199501+00	2026-05-13 15:22:18.199501+00	/assets/pekstore-parts/headset.jpg
\.


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 18, true);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);


--
-- Name: products products_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_unique UNIQUE (slug);


--
-- Name: products products_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_uuid_unique UNIQUE (uuid);


--
-- Name: products_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_name_idx ON public.products USING btree (name);


--
-- Name: products_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_status_idx ON public.products USING btree (status);


--
-- Name: products products_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_products_updated_at();


--
-- PostgreSQL database dump complete
--

\unrestrict uaPbdx5ElOTHJlKrfOKi7oscBkv5eLId4HDjTDbcNsEJrHTgm0cYw70xePWnlPw

